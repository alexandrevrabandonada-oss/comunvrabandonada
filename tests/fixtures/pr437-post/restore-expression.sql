ALTER TABLE public.comun_solidarity_offers DROP CONSTRAINT comun_solidarity_offers_modalities_check;
ALTER TABLE public.comun_solidarity_offers ADD CONSTRAINT comun_solidarity_offers_modalities_check CHECK (cardinality(modalities) between 1 and 8 and modalities <@ array['sale','exchange','donation','loan','cession','mutual_aid','cooperation','other']::text[] and array_position(modalities, null) is null);
GRANT USAGE ON SEQUENCE public.comun_search_embedding_jobs_id_seq TO postgres;
