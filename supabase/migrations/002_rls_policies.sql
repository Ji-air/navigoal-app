-- Navigoal — Migration 002 : policies RLS
-- Dépend de 001_initial_schema.sql
--
-- Principe général :
--   • Données publiques (nations, joueurs, matchs, journées, événements, cotes) : SELECT pour tous (anon + authenticated)
--   • Données utilisateur (utilisateurs, bateaux, equipages) : SELECT/INSERT/UPDATE par le propriétaire uniquement
--   • Données calculées (impulsions, scores_journee, classements) : SELECT propriétaire / service role pour les écritures
--   • Ligues et classements ligue : visibles par les membres de la ligue
--   • Classement global : lisible par tous les utilisateurs authentifiés
--
-- Les écritures sur données calculées (impulsions, scores_journee, classements_ligue,
-- classements_globaux, notifications_envoyees, bateaux.position) sont réservées au
-- service role (clé SUPABASE_SERVICE_ROLE), qui bypass RLS par design.

-- =========================================================
-- DONNÉES PUBLIQUES — lecture anon + authenticated
-- =========================================================

CREATE POLICY "nations_select_public"
  ON nations FOR SELECT
  USING (true);

CREATE POLICY "journees_select_public"
  ON journees_navigoal FOR SELECT
  USING (true);

CREATE POLICY "joueurs_select_public"
  ON joueurs FOR SELECT
  USING (true);

CREATE POLICY "matchs_select_public"
  ON matchs FOR SELECT
  USING (true);

CREATE POLICY "evenements_select_public"
  ON evenements_match FOR SELECT
  USING (true);

CREATE POLICY "cotes_select_public"
  ON cotes_match FOR SELECT
  USING (true);

-- =========================================================
-- UTILISATEURS — propre profil uniquement
-- =========================================================

CREATE POLICY "utilisateurs_select_own"
  ON utilisateurs FOR SELECT
  USING (auth.uid() = id);

-- INSERT : le trigger handle_new_user utilise le service role.
-- Si l'app insère directement (ex: onboarding), la policy ci-dessous est nécessaire.
CREATE POLICY "utilisateurs_insert_own"
  ON utilisateurs FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Le pseudo est immuable (MODELE.md) — aucune UPDATE policy client sur ce champ.
-- Si d'autres champs devaient être modifiables, ajouter une policy UPDATE ici.

-- =========================================================
-- BATEAUX — propre bateau uniquement (lecture)
-- Position mise à jour uniquement par le service role (calcul score)
-- =========================================================

CREATE POLICY "bateaux_select_own"
  ON bateaux FOR SELECT
  USING (utilisateur_id = auth.uid());

-- =========================================================
-- LIGUES_PRIVEES — membres + créateur
-- =========================================================

CREATE POLICY "ligues_select_member_or_creator"
  ON ligues_privees FOR SELECT
  USING (
    createur_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM membres_ligue
      WHERE membres_ligue.ligue_id    = ligues_privees.id
        AND membres_ligue.utilisateur_id = auth.uid()
    )
  );

CREATE POLICY "ligues_insert_own"
  ON ligues_privees FOR INSERT
  WITH CHECK (createur_id = auth.uid());

-- Le nom peut être modifié par le créateur uniquement.
CREATE POLICY "ligues_update_creator"
  ON ligues_privees FOR UPDATE
  USING     (createur_id = auth.uid())
  WITH CHECK (createur_id = auth.uid());

-- =========================================================
-- MEMBRES_LIGUE — membres de la même ligue se voient entre eux
-- =========================================================

-- Un utilisateur voit les membres d'une ligue s'il en est lui-même membre,
-- ou s'il est créateur de cette ligue (pour la page de gestion).
CREATE POLICY "membres_select_same_league"
  ON membres_ligue FOR SELECT
  USING (
    utilisateur_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM membres_ligue AS ml2
      WHERE ml2.ligue_id       = membres_ligue.ligue_id
        AND ml2.utilisateur_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM ligues_privees
      WHERE ligues_privees.id          = membres_ligue.ligue_id
        AND ligues_privees.createur_id = auth.uid()
    )
  );

-- Un utilisateur peut rejoindre une ligue pour lui-même.
CREATE POLICY "membres_insert_own"
  ON membres_ligue FOR INSERT
  WITH CHECK (utilisateur_id = auth.uid());

-- Un utilisateur peut quitter une ligue (supprimer son propre membership).
CREATE POLICY "membres_delete_own"
  ON membres_ligue FOR DELETE
  USING (utilisateur_id = auth.uid());

-- =========================================================
-- EQUIPAGES — propre équipage uniquement
-- =========================================================

CREATE POLICY "equipages_select_own"
  ON equipages FOR SELECT
  USING (utilisateur_id = auth.uid());

CREATE POLICY "equipages_insert_own"
  ON equipages FOR INSERT
  WITH CHECK (utilisateur_id = auth.uid());

-- UPDATE autorisé uniquement si la journée n'est pas encore gelée.
-- La vérification du statut_gel est applicative (comportement §8) ;
-- la policy laisse passer les updates — le serveur valide avant.
CREATE POLICY "equipages_update_own"
  ON equipages FOR UPDATE
  USING     (utilisateur_id = auth.uid())
  WITH CHECK (utilisateur_id = auth.uid());

-- =========================================================
-- IMPULSIONS — lecture par le propriétaire de l'équipage
-- Écriture : service role uniquement
-- =========================================================

CREATE POLICY "impulsions_select_own"
  ON impulsions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM equipages
      WHERE equipages.id             = impulsions.equipage_id
        AND equipages.utilisateur_id = auth.uid()
    )
  );

-- =========================================================
-- SCORES_JOURNEE — lecture par le propriétaire de l'équipage
-- Écriture : service role uniquement
-- =========================================================

CREATE POLICY "scores_journee_select_own"
  ON scores_journee FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM equipages
      WHERE equipages.id             = scores_journee.equipage_id
        AND equipages.utilisateur_id = auth.uid()
    )
  );

-- =========================================================
-- CLASSEMENTS_LIGUE — membres de la ligue
-- Écriture : service role uniquement
-- =========================================================

CREATE POLICY "classements_ligue_select_member"
  ON classements_ligue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM membres_ligue
      WHERE membres_ligue.ligue_id       = classements_ligue.ligue_id
        AND membres_ligue.utilisateur_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM ligues_privees
      WHERE ligues_privees.id          = classements_ligue.ligue_id
        AND ligues_privees.createur_id = auth.uid()
    )
  );

-- =========================================================
-- CLASSEMENTS_GLOBAUX — lisible par tous les authentifiés
-- Écriture : service role uniquement
-- =========================================================

CREATE POLICY "classements_globaux_select_authenticated"
  ON classements_globaux FOR SELECT
  TO authenticated
  USING (true);

-- =========================================================
-- NOTIFICATIONS_ENVOYEES — propre utilisateur (lecture seule)
-- Écriture : service role uniquement
-- =========================================================

CREATE POLICY "notifications_select_own"
  ON notifications_envoyees FOR SELECT
  USING (utilisateur_id = auth.uid());
