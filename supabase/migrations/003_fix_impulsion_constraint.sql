-- Migration 003 : assouplir la contrainte impulsions pour le poste Ancre
-- Problème : Ancre n'a pas d'événement déclencheur individuel (condition collective ≤1 but enc.)
--            La contrainte originale exigeait source_evenement_id pour tous les postes.
-- Solution : source_match_id requis pour tous ; source_evenement_id facultatif (Cap/Barre/Vigie le rempliront).

ALTER TABLE impulsions DROP CONSTRAINT IF EXISTS impulsions_type_poste_coherence;

ALTER TABLE impulsions ADD CONSTRAINT impulsions_type_coherence CHECK (
  -- Poste (R2) : source_match_id requis ; source_evenement_id optionnel (absent pour Ancre clean-sheet)
  (type = 'poste'     AND poste IS NOT NULL AND source_match_id IS NOT NULL)
  OR
  -- Collectif (R4) : source_match_id requis, pas d'événement individuel
  (type = 'collectif' AND source_match_id IS NOT NULL AND poste IS NULL)
);
