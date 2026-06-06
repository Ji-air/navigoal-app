-- Navigoal — Migration 001 : schéma initial
-- Source : 03_données/MODELE.md
-- Ambiguïté résolue : utilisateurs.id référence auth.users.id (pattern Supabase)
-- Ambiguïté résolue : cotes_match.gelee_a est NULLABLE (rempli au gel, pas à la création)

-- =========================================================
-- TYPES ENUM
-- =========================================================

CREATE TYPE poste_reel_type AS ENUM ('GK', 'DEF', 'MID', 'FWD');

CREATE TYPE match_phase_type AS ENUM (
  'groupes', 'huitième', 'quart', 'demi', 'troisième_place', 'finale'
);

CREATE TYPE match_statut_type AS ENUM (
  'planifié', 'en_cours', 'terminé', 'interrompu'
);

CREATE TYPE evenement_type AS ENUM (
  'but', 'assist', 'pré_assist', 'arrêt', 'but_encaissé'
);

CREATE TYPE phase_jeu_type AS ENUM (
  'temps_règlementaire', 'prolongations', 'tirs_au_but'
);

CREATE TYPE palier_type AS ENUM ('Breeze', 'Wind', 'Boost');

CREATE TYPE journee_statut_gel_type AS ENUM ('ouvert', 'gelé');

CREATE TYPE equipage_statut_type AS ENUM ('brouillon', 'validé', 'gelé');

CREATE TYPE impulsion_type AS ENUM ('poste', 'collectif');

CREATE TYPE impulsion_poste_type AS ENUM ('Cap', 'Barre', 'Ancre', 'Vigie');

CREATE TYPE notification_type AS ENUM ('rappel_gel');

-- =========================================================
-- TABLES — dans l'ordre des dépendances
-- =========================================================

-- ---------------------------------------------------------
-- nations
-- ---------------------------------------------------------
CREATE TABLE nations (
  id  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  CONSTRAINT nations_nom_unique UNIQUE (nom)
);

-- ---------------------------------------------------------
-- journees_navigoal
-- ---------------------------------------------------------
CREATE TABLE journees_navigoal (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                  INTEGER NOT NULL,
  heure_premier_match_utc TIMESTAMPTZ,          -- calculé par le service quand les matchs sont créés
  heure_gel_utc           TIMESTAMPTZ,          -- calculé : heure_premier_match_utc - 15 min (R7)
  statut_gel              journee_statut_gel_type NOT NULL DEFAULT 'ouvert',
  CONSTRAINT journees_numero_unique    UNIQUE (numero),
  CONSTRAINT journees_numero_positif   CHECK  (numero >= 1)
);

-- ---------------------------------------------------------
-- joueurs
-- ---------------------------------------------------------
CREATE TABLE joueurs (
  id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        TEXT            NOT NULL,
  nation_id  UUID            NOT NULL REFERENCES nations (id) ON DELETE RESTRICT,
  poste_reel poste_reel_type NOT NULL
);

-- ---------------------------------------------------------
-- matchs
-- ---------------------------------------------------------
CREATE TABLE matchs (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  nation_a_id           UUID              NOT NULL REFERENCES nations (id) ON DELETE RESTRICT,
  nation_b_id           UUID              NOT NULL REFERENCES nations (id) ON DELETE RESTRICT,
  phase                 match_phase_type  NOT NULL,
  date_utc              DATE              NOT NULL,
  heure_coup_envoi_utc  TIMESTAMPTZ       NOT NULL,
  statut                match_statut_type NOT NULL DEFAULT 'planifié',
  score_nation_a        INTEGER,
  score_nation_b        INTEGER,
  vainqueur_tirs_au_but UUID              REFERENCES nations (id) ON DELETE RESTRICT,
  journee_id            UUID              NOT NULL REFERENCES journees_navigoal (id) ON DELETE RESTRICT,
  CONSTRAINT matchs_nations_differentes CHECK (nation_a_id <> nation_b_id),
  CONSTRAINT matchs_scores_si_termine CHECK (
    (statut = 'terminé' AND score_nation_a IS NOT NULL AND score_nation_b IS NOT NULL)
    OR statut <> 'terminé'
  ),
  CONSTRAINT matchs_vainqueur_tab_coherent CHECK (
    vainqueur_tirs_au_but IS NULL
    OR vainqueur_tirs_au_but = nation_a_id
    OR vainqueur_tirs_au_but = nation_b_id
  )
);

-- ---------------------------------------------------------
-- evenements_match
-- ---------------------------------------------------------
CREATE TABLE evenements_match (
  id        UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id  UUID           NOT NULL REFERENCES matchs (id) ON DELETE CASCADE,
  joueur_id UUID           NOT NULL REFERENCES joueurs (id) ON DELETE RESTRICT,
  type      evenement_type NOT NULL,
  minute    INTEGER        NOT NULL,
  phase_jeu phase_jeu_type NOT NULL,
  officiel  BOOLEAN        NOT NULL DEFAULT TRUE,
  CONSTRAINT evenements_minute_positive CHECK (minute >= 1)
);

-- ---------------------------------------------------------
-- cotes_match
-- ---------------------------------------------------------
CREATE TABLE cotes_match (
  id        UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id  UUID           NOT NULL REFERENCES matchs (id) ON DELETE CASCADE,
  nation_id UUID           NOT NULL REFERENCES nations (id) ON DELETE RESTRICT,
  valeur    NUMERIC(10, 4) NOT NULL,
  palier    palier_type,              -- calculé par le service selon R3 ; NULL avant calcul
  gelee_a   TIMESTAMPTZ,             -- NULL avant le gel (R7) ; rempli au moment du gel
  CONSTRAINT cotes_valeur_positive       CHECK  (valeur > 0),
  CONSTRAINT cotes_match_nation_unique   UNIQUE (match_id, nation_id)
);

-- ---------------------------------------------------------
-- utilisateurs
-- id = auth.users.id — le trigger handle_new_user (à créer) insère la ligne à l'inscription
-- ---------------------------------------------------------
CREATE TABLE utilisateurs (
  id                   UUID      PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  pseudo               TEXT      NOT NULL,
  identifiant_session  TEXT,     -- prototype uniquement ; Supabase Auth gère les sessions en production
  date_inscription_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT utilisateurs_pseudo_unique UNIQUE (pseudo)
);

-- ---------------------------------------------------------
-- bateaux (1:1 avec utilisateurs)
-- ---------------------------------------------------------
CREATE TABLE bateaux (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id       UUID    NOT NULL REFERENCES utilisateurs (id) ON DELETE CASCADE,
  position_actuelle_nm INTEGER NOT NULL DEFAULT 0,
  canal                TEXT,
  CONSTRAINT bateaux_utilisateur_unique  UNIQUE (utilisateur_id),
  CONSTRAINT bateaux_position_non_neg    CHECK  (position_actuelle_nm >= 0)
);

-- ---------------------------------------------------------
-- ligues_privees
-- ---------------------------------------------------------
CREATE TABLE ligues_privees (
  id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  nom               TEXT      NOT NULL,
  code_invitation   TEXT      NOT NULL,
  createur_id       UUID      NOT NULL REFERENCES utilisateurs (id) ON DELETE RESTRICT,
  date_creation_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ligues_code_invitation_unique UNIQUE (code_invitation)
);

-- ---------------------------------------------------------
-- membres_ligue
-- ---------------------------------------------------------
CREATE TABLE membres_ligue (
  id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  ligue_id          UUID      NOT NULL REFERENCES ligues_privees (id) ON DELETE CASCADE,
  utilisateur_id    UUID      NOT NULL REFERENCES utilisateurs (id) ON DELETE CASCADE,
  date_adhesion_utc TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT membres_ligue_unique UNIQUE (ligue_id, utilisateur_id)
);

-- ---------------------------------------------------------
-- equipages
-- ---------------------------------------------------------
CREATE TABLE equipages (
  id               UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id   UUID                 NOT NULL REFERENCES utilisateurs (id) ON DELETE CASCADE,
  journee_id       UUID                 NOT NULL REFERENCES journees_navigoal (id) ON DELETE RESTRICT,
  cap_nation_id    UUID                 REFERENCES nations (id) ON DELETE RESTRICT,
  barre_nation_id  UUID                 REFERENCES nations (id) ON DELETE RESTRICT,
  ancre_nation_id  UUID                 REFERENCES nations (id) ON DELETE RESTRICT,
  vigie_nation_id  UUID                 REFERENCES nations (id) ON DELETE RESTRICT,
  statut           equipage_statut_type NOT NULL DEFAULT 'brouillon',
  CONSTRAINT equipages_utilisateur_journee_unique UNIQUE (utilisateur_id, journee_id)
);

-- ---------------------------------------------------------
-- impulsions
-- ---------------------------------------------------------
CREATE TABLE impulsions (
  id                    UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  equipage_id           UUID                 NOT NULL REFERENCES equipages (id) ON DELETE CASCADE,
  journee_id            UUID                 NOT NULL REFERENCES journees_navigoal (id) ON DELETE RESTRICT,
  type                  impulsion_type       NOT NULL,
  poste                 impulsion_poste_type,
  valeur_nm             INTEGER              NOT NULL,
  source_evenement_id   UUID                 REFERENCES evenements_match (id) ON DELETE SET NULL,
  source_match_id       UUID                 REFERENCES matchs (id) ON DELETE SET NULL,
  joueur_declencheur_id UUID                 REFERENCES joueurs (id) ON DELETE SET NULL,
  CONSTRAINT impulsions_valeur_positive CHECK (valeur_nm > 0),
  CONSTRAINT impulsions_type_poste_coherence CHECK (
    (type = 'poste'     AND poste IS NOT NULL AND source_evenement_id IS NOT NULL AND source_match_id IS NULL)
    OR
    (type = 'collectif' AND source_match_id IS NOT NULL AND source_evenement_id IS NULL)
  )
);

-- ---------------------------------------------------------
-- scores_journee
-- ---------------------------------------------------------
CREATE TABLE scores_journee (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  equipage_id UUID      NOT NULL REFERENCES equipages (id) ON DELETE CASCADE,
  journee_id  UUID      NOT NULL REFERENCES journees_navigoal (id) ON DELETE RESTRICT,
  total_nm    INTEGER   NOT NULL DEFAULT 0,
  calcule_a   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scores_journee_unique    UNIQUE (equipage_id, journee_id),
  CONSTRAINT scores_total_non_negatif CHECK  (total_nm >= 0)
);

-- ---------------------------------------------------------
-- classements_ligue
-- ---------------------------------------------------------
CREATE TABLE classements_ligue (
  id                 UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  ligue_id           UUID      NOT NULL REFERENCES ligues_privees (id) ON DELETE CASCADE,
  utilisateur_id     UUID      NOT NULL REFERENCES utilisateurs (id) ON DELETE CASCADE,
  journee_id         UUID      NOT NULL REFERENCES journees_navigoal (id) ON DELETE RESTRICT,
  rang               INTEGER   NOT NULL,
  ecart_precedent_nm INTEGER,
  ecart_suivant_nm   INTEGER,
  mis_a_jour_a       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT classements_ligue_unique      UNIQUE (ligue_id, utilisateur_id, journee_id),
  CONSTRAINT classements_ligue_rang_positif CHECK  (rang >= 1)
);

-- ---------------------------------------------------------
-- classements_globaux
-- ---------------------------------------------------------
CREATE TABLE classements_globaux (
  id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID      NOT NULL REFERENCES utilisateurs (id) ON DELETE CASCADE,
  journee_id     UUID      NOT NULL REFERENCES journees_navigoal (id) ON DELETE RESTRICT,
  rang           INTEGER   NOT NULL,
  cohorte        TEXT      NOT NULL,
  mis_a_jour_a   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT classements_globaux_unique      UNIQUE (utilisateur_id, journee_id),
  CONSTRAINT classements_globaux_rang_positif CHECK  (rang >= 1)
);

-- ---------------------------------------------------------
-- notifications_envoyees
-- ---------------------------------------------------------
CREATE TABLE notifications_envoyees (
  id             UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID              NOT NULL REFERENCES utilisateurs (id) ON DELETE CASCADE,
  journee_id     UUID              NOT NULL REFERENCES journees_navigoal (id) ON DELETE RESTRICT,
  type           notification_type NOT NULL,
  envoyee_a      TIMESTAMPTZ       NOT NULL DEFAULT now(),
  CONSTRAINT notifications_unique UNIQUE (utilisateur_id, journee_id, type)
);

-- =========================================================
-- INDEX — clés étrangères fréquemment requêtées
-- =========================================================

-- joueurs
CREATE INDEX idx_joueurs_nation_id     ON joueurs (nation_id);

-- matchs
CREATE INDEX idx_matchs_journee_id     ON matchs (journee_id);
CREATE INDEX idx_matchs_nation_a_id    ON matchs (nation_a_id);
CREATE INDEX idx_matchs_nation_b_id    ON matchs (nation_b_id);
CREATE INDEX idx_matchs_statut         ON matchs (statut);
CREATE INDEX idx_matchs_date_utc       ON matchs (date_utc);

-- evenements_match
CREATE INDEX idx_evenements_match_id   ON evenements_match (match_id);
CREATE INDEX idx_evenements_joueur_id  ON evenements_match (joueur_id);
CREATE INDEX idx_evenements_officiel   ON evenements_match (officiel) WHERE officiel = TRUE;

-- cotes_match
CREATE INDEX idx_cotes_match_id        ON cotes_match (match_id);
CREATE INDEX idx_cotes_nation_id       ON cotes_match (nation_id);

-- equipages
CREATE INDEX idx_equipages_utilisateur_id ON equipages (utilisateur_id);
CREATE INDEX idx_equipages_journee_id     ON equipages (journee_id);
CREATE INDEX idx_equipages_statut         ON equipages (statut);

-- impulsions
CREATE INDEX idx_impulsions_equipage_id   ON impulsions (equipage_id);
CREATE INDEX idx_impulsions_journee_id    ON impulsions (journee_id);
CREATE INDEX idx_impulsions_type          ON impulsions (type);

-- scores_journee
CREATE INDEX idx_scores_equipage_id       ON scores_journee (equipage_id);
CREATE INDEX idx_scores_journee_id        ON scores_journee (journee_id);

-- membres_ligue
CREATE INDEX idx_membres_ligue_id         ON membres_ligue (ligue_id);
CREATE INDEX idx_membres_utilisateur_id   ON membres_ligue (utilisateur_id);

-- classements_ligue
CREATE INDEX idx_cl_ligue_id              ON classements_ligue (ligue_id);
CREATE INDEX idx_cl_utilisateur_id        ON classements_ligue (utilisateur_id);
CREATE INDEX idx_cl_journee_id            ON classements_ligue (journee_id);

-- classements_globaux
CREATE INDEX idx_cg_utilisateur_id        ON classements_globaux (utilisateur_id);
CREATE INDEX idx_cg_journee_id            ON classements_globaux (journee_id);

-- notifications_envoyees
CREATE INDEX idx_notifs_utilisateur_id    ON notifications_envoyees (utilisateur_id);
CREATE INDEX idx_notifs_journee_id        ON notifications_envoyees (journee_id);

-- =========================================================
-- RLS — activation (policies dans 002_rls_policies.sql)
-- =========================================================

ALTER TABLE nations                ENABLE ROW LEVEL SECURITY;
ALTER TABLE journees_navigoal      ENABLE ROW LEVEL SECURITY;
ALTER TABLE joueurs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE evenements_match       ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotes_match            ENABLE ROW LEVEL SECURITY;
ALTER TABLE utilisateurs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bateaux                ENABLE ROW LEVEL SECURITY;
ALTER TABLE ligues_privees         ENABLE ROW LEVEL SECURITY;
ALTER TABLE membres_ligue          ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE impulsions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores_journee         ENABLE ROW LEVEL SECURITY;
ALTER TABLE classements_ligue      ENABLE ROW LEVEL SECURITY;
ALTER TABLE classements_globaux    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications_envoyees ENABLE ROW LEVEL SECURITY;
