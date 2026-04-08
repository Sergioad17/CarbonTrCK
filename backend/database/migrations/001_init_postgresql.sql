//el estado exacto del esquema en el momento inicial de desarrollo, para facilitar la creación de bases de datos nuevas y servir como referencia para futuras migraciones
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$ BEGIN CREATE TYPE record_status AS ENUM ('real','est','draft','pending','approved','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE scope_code AS ENUM ('scope1','scope2','scope3'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE asset_type AS ENUM ('meter','vehicle','equipment','generator','hvac','it_device','tractor','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE file_kind AS ENUM ('receipt','photo','survey','inventory','report','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE export_status AS ENUM ('queued','running','done','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE export_format AS ENUM ('csv','pdf','xlsx'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE target_type AS ENUM ('absolute','reduction_percent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notif_status AS ENUM ('unread','read','archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE target_status AS ENUM ('active','paused','completed','at_risk'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE action_status AS ENUM ('planned','in_progress','done','blocked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE area_access_mode AS ENUM ('all','custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE profile_change_type AS ENUM ('email','password'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE profile_change_status AS ENUM ('pending','approved','rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ml_model_family AS ENUM ('xgboost','isolation_forest','prophet','custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ml_model_use AS ENUM ('prediction','anomaly_detection','trend_forecast'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE ml_run_status AS ENUM ('queued','running','succeeded','failed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at:=now(); RETURN NEW; END; $$;
CREATE OR REPLACE FUNCTION validate_metric_unit_dimension(p_metric_id uuid,p_unit_id uuid) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE v_metric_dimension text; v_unit_dimension text;
BEGIN
  SELECT dimension INTO v_metric_dimension FROM metrics WHERE id=p_metric_id;
  SELECT dimension INTO v_unit_dimension FROM units WHERE id=p_unit_id;
  RETURN v_metric_dimension IS NOT NULL AND v_unit_dimension IS NOT NULL AND v_metric_dimension=v_unit_dimension;
END; $$;
CREATE OR REPLACE FUNCTION trg_metrics_validate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_unit_dimension text;
BEGIN
  SELECT dimension INTO v_unit_dimension FROM units WHERE id=NEW.base_unit_id;
  IF v_unit_dimension IS NULL THEN RAISE EXCEPTION 'La unidad base % no existe.',NEW.base_unit_id; END IF;
  IF NEW.dimension<>v_unit_dimension THEN RAISE EXCEPTION 'La dimension de metrics (%) debe coincidir con la de la unidad base (%).',NEW.dimension,v_unit_dimension; END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION trg_emission_categories_validate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT validate_metric_unit_dimension(NEW.default_metric_id,NEW.default_unit_id) THEN
    RAISE EXCEPTION 'La unidad por defecto (%) debe coincidir con la dimension de la metrica por defecto (%).',NEW.default_unit_id,NEW.default_metric_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION trg_emission_factors_validate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_numerator_dimension text;
BEGIN
  IF NEW.valid_to IS NOT NULL AND NEW.valid_to<NEW.valid_from THEN RAISE EXCEPTION 'valid_to no puede ser menor que valid_from.'; END IF;
  IF NOT validate_metric_unit_dimension(NEW.metric_id,NEW.denominator_unit_id) THEN
    RAISE EXCEPTION 'La unidad denominador (%) debe coincidir con la dimension de la metrica (%).',NEW.denominator_unit_id,NEW.metric_id;
  END IF;
  SELECT dimension INTO v_numerator_dimension FROM units WHERE id=NEW.numerator_unit_id;
  IF v_numerator_dimension IS NULL THEN RAISE EXCEPTION 'La unidad numerador % no existe.',NEW.numerator_unit_id; END IF;
  IF v_numerator_dimension<>'co2e' THEN RAISE EXCEPTION 'La unidad numerador (%) debe ser de dimension co2e.',NEW.numerator_unit_id; END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION trg_records_validate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT validate_metric_unit_dimension(NEW.metric_id,NEW.unit_id) THEN
    RAISE EXCEPTION 'La unidad (%) del registro debe coincidir con la dimension de la metrica (%).',NEW.unit_id,NEW.metric_id;
  END IF;
  IF NEW.status='approved' AND (NEW.approved_by IS NULL OR NEW.approved_at IS NULL) THEN
    RAISE EXCEPTION 'Un registro aprobado debe tener approved_by y approved_at.';
  END IF;
  IF NEW.status<>'approved' AND (NEW.approved_by IS NOT NULL OR NEW.approved_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Solo los registros aprobados pueden tener approved_by y approved_at.';
  END IF;
  IF (NEW.approved_by IS NULL)<>(NEW.approved_at IS NULL) THEN
    RAISE EXCEPTION 'approved_by y approved_at deben establecerse juntos o ambos ser nulos.';
  END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION trg_targets_validate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.area_id IS NOT NULL AND NEW.campus_id IS NULL THEN RAISE EXCEPTION 'Una meta por area debe indicar tambien el campus.'; END IF;
  IF NEW.baseline_start IS NOT NULL AND NEW.baseline_end IS NOT NULL AND NEW.baseline_end<NEW.baseline_start THEN RAISE EXCEPTION 'baseline_end no puede ser menor que baseline_start.'; END IF;
  IF NEW.target_end<NEW.target_start THEN RAISE EXCEPTION 'target_end no puede ser menor que target_start.'; END IF;
  IF (NEW.baseline_start IS NULL)<>(NEW.baseline_end IS NULL) THEN RAISE EXCEPTION 'baseline_start y baseline_end deben capturarse juntos o ambos ser nulos.'; END IF;
  IF NOT validate_metric_unit_dimension(NEW.metric_id,NEW.unit_id) THEN
    RAISE EXCEPTION 'La unidad (%) de la meta debe coincidir con la dimension de la metrica (%).',NEW.unit_id,NEW.metric_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION trg_ml_models_validate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.scope_id IS NULL)<>(NEW.category_id IS NULL) THEN RAISE EXCEPTION 'scope_id y category_id deben capturarse juntos o ambos ser nulos.'; END IF;
  IF (NEW.target_metric_id IS NULL)<>(NEW.target_unit_id IS NULL) THEN RAISE EXCEPTION 'target_metric_id y target_unit_id deben capturarse juntos o ambos ser nulos.'; END IF;
  IF NEW.target_metric_id IS NOT NULL AND NOT validate_metric_unit_dimension(NEW.target_metric_id,NEW.target_unit_id) THEN
    RAISE EXCEPTION 'La unidad objetivo (%) debe coincidir con la dimension de la metrica objetivo (%).',NEW.target_unit_id,NEW.target_metric_id;
  END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION trg_ml_predictions_validate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_target_metric_id uuid;
BEGIN
  IF NEW.area_id IS NOT NULL AND NEW.campus_id IS NULL THEN RAISE EXCEPTION 'Una prediccion por area debe indicar tambien el campus.'; END IF;
  IF NEW.predicted_quantity IS NOT NULL AND NEW.predicted_unit_id IS NULL THEN RAISE EXCEPTION 'predicted_unit_id es obligatorio cuando predicted_quantity tiene valor.'; END IF;
  IF NEW.predicted_quantity IS NULL AND NEW.predicted_unit_id IS NOT NULL THEN RAISE EXCEPTION 'predicted_unit_id no debe existir si predicted_quantity es nulo.'; END IF;
  IF NEW.predicted_quantity IS NULL AND NEW.predicted_co2e_kg IS NULL THEN RAISE EXCEPTION 'La prediccion debe guardar cantidad, CO2e o ambos.'; END IF;
  IF NEW.predicted_quantity IS NOT NULL THEN
    SELECT target_metric_id INTO v_target_metric_id FROM ml_models WHERE id=NEW.model_id;
    IF v_target_metric_id IS NOT NULL AND NOT validate_metric_unit_dimension(v_target_metric_id,NEW.predicted_unit_id) THEN
      RAISE EXCEPTION 'La unidad predicha (%) no coincide con la metrica objetivo del modelo (%).',NEW.predicted_unit_id,v_target_metric_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION trg_monthly_forecasts_validate() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE v_target_metric_id uuid;
BEGIN
  IF NEW.area_id IS NOT NULL AND NEW.campus_id IS NULL THEN RAISE EXCEPTION 'Un forecast por area debe indicar tambien el campus.'; END IF;
  IF NEW.predicted_quantity IS NOT NULL AND NEW.predicted_unit_id IS NULL THEN RAISE EXCEPTION 'predicted_unit_id es obligatorio cuando predicted_quantity tiene valor.'; END IF;
  IF NEW.predicted_quantity IS NULL AND NEW.predicted_unit_id IS NOT NULL THEN RAISE EXCEPTION 'predicted_unit_id no debe existir si predicted_quantity es nulo.'; END IF;
  IF NEW.predicted_quantity IS NULL AND NEW.predicted_co2e_kg IS NULL THEN RAISE EXCEPTION 'El forecast debe guardar cantidad, CO2e o ambos.'; END IF;
  IF NEW.predicted_quantity IS NOT NULL THEN
    SELECT target_metric_id INTO v_target_metric_id FROM ml_models WHERE id=NEW.model_id;
    IF v_target_metric_id IS NOT NULL AND NOT validate_metric_unit_dimension(v_target_metric_id,NEW.predicted_unit_id) THEN
      RAISE EXCEPTION 'La unidad forecast (%) no coincide con la metrica objetivo del modelo (%).',NEW.predicted_unit_id,v_target_metric_id;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(200) NOT NULL,
  legal_name varchar(250),
  country_code char(2) NOT NULL DEFAULT 'MX',
  state varchar(120),
  city varchar(120),
  timezone varchar(64) NOT NULL DEFAULT 'America/Monterrey',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT organizations_country_code_chk CHECK (country_code ~ '^[A-Z]{2}$')
);
CREATE TABLE campuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name varchar(200) NOT NULL,
  code varchar(50),
  address_line varchar(250),
  city varchar(120),
  state varchar(120),
  country_code char(2) NOT NULL DEFAULT 'MX',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campuses_id_organization_uq UNIQUE (id,organization_id),
  CONSTRAINT campuses_org_name_uq UNIQUE (organization_id,name),
  CONSTRAINT campuses_org_code_uq UNIQUE (organization_id,code),
  CONSTRAINT campuses_country_code_chk CHECK (country_code ~ '^[A-Z]{2}$')
);
CREATE TABLE buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id uuid NOT NULL REFERENCES campuses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name varchar(200) NOT NULL,
  code varchar(50),
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT buildings_id_campus_uq UNIQUE (id,campus_id),
  CONSTRAINT buildings_campus_name_uq UNIQUE (campus_id,name),
  CONSTRAINT buildings_campus_code_uq UNIQUE (campus_id,code)
);
CREATE TABLE areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id uuid NOT NULL REFERENCES campuses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  building_id uuid,
  parent_area_id uuid,
  code varchar(60),
  name varchar(220) NOT NULL,
  description text,
  tags varchar(250),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT areas_building_fk FOREIGN KEY (building_id,campus_id) REFERENCES buildings(id,campus_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT areas_parent_fk FOREIGN KEY (parent_area_id,campus_id) REFERENCES areas(id,campus_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT areas_id_campus_uq UNIQUE (id,campus_id),
  CONSTRAINT areas_campus_code_uq UNIQUE (campus_id,code),
  CONSTRAINT areas_self_parent_chk CHECK (id IS DISTINCT FROM parent_area_id)
);
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  campus_id uuid,
  area_access_mode area_access_mode NOT NULL DEFAULT 'all',
  numeric_id varchar(40),
  first_name varchar(120),
  paternal_last_name varchar(120),
  maternal_last_name varchar(120),
  email citext NOT NULL,
  password_hash varchar(255) NOT NULL,
  full_name varchar(200) NOT NULL,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_org_campus_fk FOREIGN KEY (campus_id,organization_id) REFERENCES campuses(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT users_id_organization_uq UNIQUE (id,organization_id),
  CONSTRAINT users_org_email_uq UNIQUE (organization_id,email)
);
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name varchar(80) NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_id_organization_uq UNIQUE (id,organization_id),
  CONSTRAINT roles_org_name_uq UNIQUE (organization_id,name)
);
CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(80) NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT role_permissions_role_permission_uq UNIQUE (role_id,permission_id)
);
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  campus_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_user_fk FOREIGN KEY (user_id,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT user_roles_role_fk FOREIGN KEY (role_id,organization_id) REFERENCES roles(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT user_roles_campus_fk FOREIGN KEY (campus_id,organization_id) REFERENCES campuses(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT
);
CREATE TABLE user_area_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  campus_id uuid NOT NULL,
  area_id uuid NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_area_access_user_fk FOREIGN KEY (user_id,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT user_area_access_campus_fk FOREIGN KEY (campus_id,organization_id) REFERENCES campuses(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT user_area_access_area_fk FOREIGN KEY (area_id,campus_id) REFERENCES areas(id,campus_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT user_area_access_created_by_fk FOREIGN KEY (created_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT user_area_access_uq UNIQUE (user_id,area_id)
);
CREATE TABLE units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(40) NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  symbol varchar(20),
  dimension varchar(30) NOT NULL,
  to_base_multiplier numeric(20,10) NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT units_id_dimension_uq UNIQUE (id,dimension),
  CONSTRAINT units_dimension_chk CHECK (btrim(dimension)<>''),
  CONSTRAINT units_to_base_multiplier_chk CHECK (to_base_multiplier>0)
);
CREATE TABLE metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(60) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  dimension varchar(30) NOT NULL,
  base_unit_id uuid NOT NULL REFERENCES units(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT metrics_dimension_chk CHECK (btrim(dimension)<>'')
);
CREATE TABLE data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(40) NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  reliability_rank smallint NOT NULL DEFAULT 3,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT data_sources_reliability_rank_chk CHECK (reliability_rank BETWEEN 1 AND 5)
);
CREATE TABLE estimation_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(60) NOT NULL UNIQUE,
  name varchar(120) NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE fuel_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(40) NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true
);
CREATE TABLE emission_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code scope_code NOT NULL UNIQUE,
  name varchar(80) NOT NULL,
  description text
);
CREATE TABLE emission_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id uuid NOT NULL REFERENCES emission_scopes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  code varchar(60) NOT NULL,
  name varchar(120) NOT NULL,
  default_metric_id uuid NOT NULL REFERENCES metrics(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  default_unit_id uuid NOT NULL REFERENCES units(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT emission_categories_id_scope_uq UNIQUE (id,scope_id),
  CONSTRAINT emission_categories_scope_code_uq UNIQUE (scope_id,code)
);
CREATE TABLE activity_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES emission_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name varchar(200) NOT NULL,
  suggested_asset_type asset_type,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT activity_types_id_category_uq UNIQUE (id,category_id),
  CONSTRAINT activity_types_category_name_uq UNIQUE (category_id,name)
);
CREATE TABLE emission_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id uuid NOT NULL,
  category_id uuid NOT NULL,
  metric_id uuid NOT NULL REFERENCES metrics(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  numerator_unit_id uuid NOT NULL REFERENCES units(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  denominator_unit_id uuid NOT NULL REFERENCES units(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  value numeric(20,10) NOT NULL,
  region varchar(120),
  provider varchar(120),
  source_url text,
  valid_from date NOT NULL,
  valid_to date,
  is_default boolean NOT NULL DEFAULT false,
  uncertainty_pct numeric(8,4),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT emission_factors_category_scope_fk FOREIGN KEY (category_id,scope_id) REFERENCES emission_categories(id,scope_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT emission_factors_id_match_uq UNIQUE (id,scope_id,category_id,metric_id,denominator_unit_id),
  CONSTRAINT emission_factors_value_chk CHECK (value>=0),
  CONSTRAINT emission_factors_uncertainty_chk CHECK (uncertainty_pct IS NULL OR uncertainty_pct BETWEEN 0 AND 100),
  CONSTRAINT emission_factors_valid_range_chk CHECK (valid_to IS NULL OR valid_to>=valid_from),
  CONSTRAINT emission_factors_active_period_excl EXCLUDE USING gist (
    category_id WITH =,
    metric_id WITH =,
    denominator_unit_id WITH =,
    (COALESCE(region,'GLOBAL')) WITH =,
    (COALESCE(provider,'UNSPECIFIED')) WITH =,
    daterange(valid_from,COALESCE(valid_to,'infinity'::date),'[]') WITH &&
  )
);
CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campus_id uuid NOT NULL REFERENCES campuses(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  area_id uuid,
  type asset_type NOT NULL,
  category_code varchar(30),
  ui_type_code varchar(40),
  name varchar(200) NOT NULL,
  manufacturer varchar(120),
  model varchar(120),
  serial_number varchar(120),
  fuel_type_id uuid REFERENCES fuel_types(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  is_mobile boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assets_area_fk FOREIGN KEY (area_id,campus_id) REFERENCES areas(id,campus_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT assets_id_campus_uq UNIQUE (id,campus_id),
  CONSTRAINT assets_mobile_area_chk CHECK (is_mobile OR area_id IS NOT NULL),
  CONSTRAINT assets_fuel_type_applicability_chk CHECK (fuel_type_id IS NULL OR type IN ('vehicle','generator','tractor')),
  CONSTRAINT assets_category_code_chk CHECK (category_code IS NULL OR category_code IN ('electricidad','combustible','otros'))
);
CREATE TABLE equipment_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  campus_id uuid NOT NULL,
  area_id uuid NOT NULL,
  category_code varchar(30) NOT NULL DEFAULT 'electricidad',
  ui_type_code varchar(40) NOT NULL,
  name varchar(200) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  power_w numeric(12,4) NOT NULL DEFAULT 0,
  usage_hours_per_day numeric(10,4) NOT NULL DEFAULT 0,
  usage_days_per_week numeric(10,4) NOT NULL DEFAULT 0,
  usage_weeks_per_month numeric(10,4) NOT NULL DEFAULT 4.3,
  notes text,
  asset_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT equipment_inventory_campus_fk FOREIGN KEY (campus_id,organization_id) REFERENCES campuses(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT equipment_inventory_area_fk FOREIGN KEY (area_id,campus_id) REFERENCES areas(id,campus_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT equipment_inventory_asset_fk FOREIGN KEY (asset_id,campus_id) REFERENCES assets(id,campus_id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT equipment_inventory_created_by_fk FOREIGN KEY (created_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT equipment_inventory_category_chk CHECK (category_code IN ('electricidad','combustible','otros')),
  CONSTRAINT equipment_inventory_name_chk CHECK (btrim(name) <> ''),
  CONSTRAINT equipment_inventory_quantity_chk CHECK (quantity >= 0),
  CONSTRAINT equipment_inventory_power_chk CHECK (power_w >= 0),
  CONSTRAINT equipment_inventory_usage_hours_chk CHECK (usage_hours_per_day >= 0),
  CONSTRAINT equipment_inventory_usage_days_chk CHECK (usage_days_per_week >= 0),
  CONSTRAINT equipment_inventory_usage_weeks_chk CHECK (usage_weeks_per_month > 0)
);

CREATE TABLE records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  campus_id uuid NOT NULL,
  area_id uuid NOT NULL,
  scope_id uuid NOT NULL,
  category_id uuid NOT NULL,
  metric_id uuid NOT NULL REFERENCES metrics(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  unit_id uuid NOT NULL REFERENCES units(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  record_date date NOT NULL,
  activity_type_id uuid,
  activity_text varchar(255) NOT NULL,
  asset_id uuid,
  fuel_type_id uuid REFERENCES fuel_types(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  quantity_value numeric(20,6) NOT NULL,
  emission_factor_id uuid,
  factor_value_used numeric(20,10) NOT NULL,
  co2e_kg numeric(20,6) NOT NULL,
  status record_status NOT NULL DEFAULT 'real',
  data_source_id uuid NOT NULL REFERENCES data_sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  estimation_method_id uuid REFERENCES estimation_methods(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  is_estimated boolean GENERATED ALWAYS AS ((status='est') OR estimation_method_id IS NOT NULL) STORED,
  co2e_t numeric(20,6) GENERATED ALWAYS AS (round(co2e_kg/1000,6)) STORED,
  note text,
  evidence_text varchar(255),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid,
  approved_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT records_organization_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT records_org_campus_fk FOREIGN KEY (campus_id,organization_id) REFERENCES campuses(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT records_area_fk FOREIGN KEY (area_id,campus_id) REFERENCES areas(id,campus_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT records_category_scope_fk FOREIGN KEY (category_id,scope_id) REFERENCES emission_categories(id,scope_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT records_activity_type_fk FOREIGN KEY (activity_type_id,category_id) REFERENCES activity_types(id,category_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT records_asset_fk FOREIGN KEY (asset_id,campus_id) REFERENCES assets(id,campus_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT records_emission_factor_fk FOREIGN KEY (emission_factor_id,scope_id,category_id,metric_id,unit_id) REFERENCES emission_factors(id,scope_id,category_id,metric_id,denominator_unit_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT records_created_by_fk FOREIGN KEY (created_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT records_updated_by_fk FOREIGN KEY (updated_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT records_approved_by_fk FOREIGN KEY (approved_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT records_quantity_value_chk CHECK (quantity_value>=0),
  CONSTRAINT records_factor_value_used_chk CHECK (factor_value_used>=0),
  CONSTRAINT records_co2e_kg_chk CHECK (co2e_kg>=0),
  CONSTRAINT records_activity_text_chk CHECK (btrim(activity_text)<>''),
  CONSTRAINT records_approved_pair_chk CHECK ((approved_by IS NULL)=(approved_at IS NULL)),
  CONSTRAINT records_deleted_after_created_chk CHECK (deleted_at IS NULL OR deleted_at>=created_at),
  CONSTRAINT records_id_organization_uq UNIQUE (id,organization_id)
);
CREATE TABLE record_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES records(id) ON UPDATE CASCADE ON DELETE CASCADE,
  revision_no integer NOT NULL,
  changed_by uuid NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  changed_at timestamptz NOT NULL DEFAULT now(),
  change_reason varchar(240),
  snapshot jsonb NOT NULL,
  CONSTRAINT record_revisions_revision_no_chk CHECK (revision_no>0),
  CONSTRAINT record_revisions_record_revision_uq UNIQUE (record_id,revision_no)
);
CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  uploaded_by uuid NOT NULL,
  kind file_kind NOT NULL DEFAULT 'other',
  file_name varchar(255) NOT NULL,
  mime_type varchar(120) NOT NULL,
  size_bytes bigint NOT NULL,
  storage_url text NOT NULL,
  checksum_sha256 char(64),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT files_uploaded_by_fk FOREIGN KEY (uploaded_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT files_id_organization_uq UNIQUE (id,organization_id),
  CONSTRAINT files_size_bytes_chk CHECK (size_bytes>=0),
  CONSTRAINT files_checksum_sha256_chk CHECK (checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9A-Fa-f]{64}$')
);
CREATE TABLE record_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES records(id) ON UPDATE CASCADE ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES files(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  purpose varchar(60) NOT NULL DEFAULT 'evidence',
  is_primary boolean NOT NULL DEFAULT false,
  note varchar(200),
  CONSTRAINT record_files_record_file_uq UNIQUE (record_id,file_id)
);
CREATE TABLE targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  campus_id uuid,
  area_id uuid,
  scope_id uuid,
  category_id uuid,
  metric_id uuid NOT NULL REFERENCES metrics(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  unit_id uuid NOT NULL REFERENCES units(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  type target_type NOT NULL,
  baseline_start date,
  baseline_end date,
  target_start date NOT NULL,
  target_end date NOT NULL,
  baseline_value numeric(20,6),
  target_value numeric(20,6) NOT NULL,
  title varchar(180) NOT NULL,
  description text,
  status target_status NOT NULL DEFAULT 'active',
  pause_reason varchar(240),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT targets_scope_category_pair_chk CHECK ((scope_id IS NULL AND category_id IS NULL) OR (scope_id IS NOT NULL AND category_id IS NOT NULL)),
  CONSTRAINT targets_reduction_percent_chk CHECK (type<>'reduction_percent' OR (baseline_value IS NOT NULL AND target_value BETWEEN 0 AND 100)),
  CONSTRAINT targets_title_chk CHECK (btrim(title)<>''),
  CONSTRAINT targets_id_organization_uq UNIQUE (id,organization_id),
  CONSTRAINT targets_campus_fk FOREIGN KEY (campus_id,organization_id) REFERENCES campuses(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT targets_area_fk FOREIGN KEY (area_id,campus_id) REFERENCES areas(id,campus_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT targets_category_scope_fk FOREIGN KEY (category_id,scope_id) REFERENCES emission_categories(id,scope_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT targets_created_by_fk FOREIGN KEY (created_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT targets_baseline_value_chk CHECK (baseline_value IS NULL OR baseline_value>=0),
  CONSTRAINT targets_target_value_chk CHECK (target_value>=0)
);
CREATE TABLE target_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  target_id uuid NOT NULL,
  title varchar(180) NOT NULL,
  owner_user_id uuid,
  owner_name varchar(160),
  status action_status NOT NULL DEFAULT 'planned',
  start_date date,
  end_date date,
  impact_tco2e numeric(20,6) NOT NULL DEFAULT 0,
  evidence_text varchar(255),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT target_actions_target_fk FOREIGN KEY (target_id,organization_id) REFERENCES targets(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT target_actions_owner_user_fk FOREIGN KEY (owner_user_id,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT target_actions_created_by_fk FOREIGN KEY (created_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT target_actions_title_chk CHECK (btrim(title)<>''),
  CONSTRAINT target_actions_impact_chk CHECK (impact_tco2e>=0),
  CONSTRAINT target_actions_date_range_chk CHECK (end_date IS NULL OR start_date IS NULL OR end_date>=start_date)
);
CREATE TABLE exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  requested_by uuid NOT NULL,
  name varchar(160),
  format export_format NOT NULL DEFAULT 'csv',
  status export_status NOT NULL DEFAULT 'queued',
  params jsonb NOT NULL,
  file_id uuid,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT exports_requested_by_fk FOREIGN KEY (requested_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT exports_file_fk FOREIGN KEY (file_id,organization_id) REFERENCES files(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT exports_completed_after_created_chk CHECK (completed_at IS NULL OR completed_at>=created_at)
);
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  status notif_status NOT NULL DEFAULT 'unread',
  type varchar(60) NOT NULL,
  title varchar(160) NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CONSTRAINT notifications_user_fk FOREIGN KEY (user_id,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT notifications_title_chk CHECK (btrim(title)<>''),
  CONSTRAINT notifications_read_after_created_chk CHECK (read_at IS NULL OR read_at>=created_at)
);
CREATE TABLE user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  theme varchar(20) NOT NULL DEFAULT 'system',
  locale jsonb NOT NULL DEFAULT '{}'::jsonb,
  ui jsonb NOT NULL DEFAULT '{}'::jsonb,
  units jsonb NOT NULL DEFAULT '{}'::jsonb,
  defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  rounding jsonb NOT NULL DEFAULT '{}'::jsonb,
  storage jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_settings_user_fk FOREIGN KEY (user_id,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT user_settings_user_uq UNIQUE (user_id),
  CONSTRAINT user_settings_theme_chk CHECK (theme IN ('light','dark','system'))
);
CREATE TABLE profile_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  user_id uuid NOT NULL,
  requester_role varchar(40) NOT NULL,
  type profile_change_type NOT NULL,
  status profile_change_status NOT NULL DEFAULT 'pending',
  current_value varchar(255),
  requested_value varchar(255),
  reason text,
  detail text,
  resolution_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_user_id uuid,
  CONSTRAINT profile_change_requests_user_fk FOREIGN KEY (user_id,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT profile_change_requests_resolved_by_fk FOREIGN KEY (resolved_by_user_id,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT profile_change_requests_resolution_pair_chk CHECK ((resolved_by_user_id IS NULL) = (resolved_at IS NULL))
);
CREATE TABLE profile_change_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES profile_change_requests(id) ON UPDATE CASCADE ON DELETE CASCADE,
  action varchar(40) NOT NULL,
  actor_user_id uuid,
  actor_organization_id uuid,
  actor_name varchar(160) NOT NULL DEFAULT 'Sistema',
  detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_change_request_events_actor_fk FOREIGN KEY (actor_user_id,actor_organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT profile_change_request_events_action_chk CHECK (btrim(action)<>'')
);
CREATE TABLE iot_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  campus_id uuid,
  code varchar(100) NOT NULL,
  name varchar(160),
  device_type varchar(60) NOT NULL DEFAULT 'esp32',
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT iot_devices_id_organization_uq UNIQUE (id,organization_id),
  CONSTRAINT iot_devices_campus_fk FOREIGN KEY (campus_id,organization_id) REFERENCES campuses(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT iot_devices_code_uq UNIQUE (organization_id,code)
);
CREATE TABLE device_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  device_id uuid NOT NULL,
  campus_id uuid NOT NULL,
  area_id uuid NOT NULL,
  voltage numeric(10,4) NOT NULL DEFAULT 127,
  power_factor numeric(8,4) NOT NULL DEFAULT 0.9,
  interval_seconds integer NOT NULL DEFAULT 900,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_bindings_device_fk FOREIGN KEY (device_id,organization_id) REFERENCES iot_devices(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT device_bindings_campus_fk FOREIGN KEY (campus_id,organization_id) REFERENCES campuses(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT device_bindings_area_fk FOREIGN KEY (area_id,campus_id) REFERENCES areas(id,campus_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT device_bindings_updated_by_fk FOREIGN KEY (updated_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT device_bindings_device_uq UNIQUE (device_id),
  CONSTRAINT device_bindings_voltage_chk CHECK (voltage>0),
  CONSTRAINT device_bindings_pf_chk CHECK (power_factor>0 AND power_factor<=1),
  CONSTRAINT device_bindings_interval_chk CHECK (interval_seconds>0)
);
CREATE TABLE device_last_totals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  device_id uuid NOT NULL,
  last_total_kwh numeric(20,6) NOT NULL DEFAULT 0,
  last_timestamp timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_last_totals_device_fk FOREIGN KEY (device_id,organization_id) REFERENCES iot_devices(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT device_last_totals_device_uq UNIQUE (device_id),
  CONSTRAINT device_last_totals_kwh_chk CHECK (last_total_kwh>=0)
);
CREATE TABLE device_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  device_id uuid NOT NULL,
  recorded_at timestamptz NOT NULL,
  schema_version varchar(20),
  total_kwh numeric(20,6),
  delta_kwh numeric(20,6),
  voltage numeric(10,4),
  current_amp numeric(12,6),
  power_factor numeric(8,4),
  interval_seconds integer,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_record_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_readings_device_fk FOREIGN KEY (device_id,organization_id) REFERENCES iot_devices(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT device_readings_created_record_fk FOREIGN KEY (created_record_id) REFERENCES records(id) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT device_readings_total_chk CHECK (total_kwh IS NULL OR total_kwh>=0),
  CONSTRAINT device_readings_delta_chk CHECK (delta_kwh IS NULL OR delta_kwh>=0),
  CONSTRAINT device_readings_voltage_chk CHECK (voltage IS NULL OR voltage>0),
  CONSTRAINT device_readings_pf_chk CHECK (power_factor IS NULL OR (power_factor>0 AND power_factor<=1)),
  CONSTRAINT device_readings_interval_chk CHECK (interval_seconds IS NULL OR interval_seconds>0)
);
CREATE TABLE ml_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name varchar(160) NOT NULL,
  family ml_model_family NOT NULL,
  primary_use ml_model_use NOT NULL,
  scope_id uuid,
  category_id uuid,
  target_metric_id uuid REFERENCES metrics(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  target_unit_id uuid REFERENCES units(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  version varchar(40) NOT NULL,
  features_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  hyperparameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  artifact_url text,
  trained_from date,
  trained_to date,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ml_models_target_metric_unit_pair_chk CHECK ((target_metric_id IS NULL AND target_unit_id IS NULL) OR (target_metric_id IS NOT NULL AND target_unit_id IS NOT NULL)),
  CONSTRAINT ml_models_category_scope_fk FOREIGN KEY (category_id,scope_id) REFERENCES emission_categories(id,scope_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ml_models_created_by_fk FOREIGN KEY (created_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ml_models_id_organization_uq UNIQUE (id,organization_id),
  CONSTRAINT ml_models_org_name_version_uq UNIQUE (organization_id,name,version),
  CONSTRAINT ml_models_training_range_chk CHECK (trained_to IS NULL OR trained_from IS NULL OR trained_to>=trained_from),
  CONSTRAINT ml_models_family_use_chk CHECK (
    (family='xgboost' AND primary_use='prediction')
    OR (family='isolation_forest' AND primary_use='anomaly_detection')
    OR (family='prophet' AND primary_use='trend_forecast')
    OR (family='custom')
  )
);
CREATE TABLE ml_model_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  model_id uuid NOT NULL,
  run_status ml_run_status NOT NULL DEFAULT 'queued',
  run_started_at timestamptz,
  run_finished_at timestamptz,
  training_rows integer,
  validation_rows integer,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  artifact_url text,
  error_message text,
  triggered_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ml_model_runs_model_fk FOREIGN KEY (model_id,organization_id) REFERENCES ml_models(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT ml_model_runs_triggered_by_fk FOREIGN KEY (triggered_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ml_model_runs_counts_chk CHECK ((training_rows IS NULL OR training_rows >= 0) AND (validation_rows IS NULL OR validation_rows >= 0)),
  CONSTRAINT ml_model_runs_time_chk CHECK (run_finished_at IS NULL OR run_started_at IS NULL OR run_finished_at >= run_started_at)
);
CREATE TABLE ml_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  model_id uuid NOT NULL,
  campus_id uuid,
  area_id uuid,
  target_date date NOT NULL,
  predicted_quantity numeric(20,6),
  predicted_unit_id uuid REFERENCES units(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  predicted_co2e_kg numeric(20,6),
  confidence numeric(6,4),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ml_predictions_model_fk FOREIGN KEY (model_id,organization_id) REFERENCES ml_models(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT ml_predictions_campus_fk FOREIGN KEY (campus_id,organization_id) REFERENCES campuses(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ml_predictions_area_fk FOREIGN KEY (area_id,campus_id) REFERENCES areas(id,campus_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT ml_predictions_confidence_chk CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  CONSTRAINT ml_predictions_predicted_quantity_chk CHECK (predicted_quantity IS NULL OR predicted_quantity>=0),
  CONSTRAINT ml_predictions_predicted_co2e_kg_chk CHECK (predicted_co2e_kg IS NULL OR predicted_co2e_kg>=0)
);
CREATE TABLE anomaly_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  model_id uuid NOT NULL,
  record_id uuid,
  detected_at timestamptz NOT NULL DEFAULT now(),
  anomaly_score numeric(12,6) NOT NULL,
  is_anomaly boolean NOT NULL,
  threshold_used numeric(12,6),
  explanation jsonb NOT NULL DEFAULT '{}'::jsonb,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note varchar(240),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT anomaly_detections_model_fk FOREIGN KEY (model_id,organization_id) REFERENCES ml_models(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT anomaly_detections_record_fk FOREIGN KEY (record_id,organization_id) REFERENCES records(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT anomaly_detections_reviewed_by_fk FOREIGN KEY (reviewed_by,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT anomaly_detections_review_pair_chk CHECK ((reviewed_by IS NULL) = (reviewed_at IS NULL))
);
CREATE TABLE monthly_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  model_id uuid NOT NULL,
  campus_id uuid,
  area_id uuid,
  scope_id uuid,
  category_id uuid,
  forecast_month date NOT NULL,
  predicted_quantity numeric(20,6),
  predicted_unit_id uuid REFERENCES units(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  predicted_co2e_kg numeric(20,6),
  lower_bound numeric(20,6),
  upper_bound numeric(20,6),
  confidence numeric(6,4),
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monthly_forecasts_model_fk FOREIGN KEY (model_id,organization_id) REFERENCES ml_models(id,organization_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT monthly_forecasts_campus_fk FOREIGN KEY (campus_id,organization_id) REFERENCES campuses(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT monthly_forecasts_area_fk FOREIGN KEY (area_id,campus_id) REFERENCES areas(id,campus_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT monthly_forecasts_category_scope_fk FOREIGN KEY (category_id,scope_id) REFERENCES emission_categories(id,scope_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT monthly_forecasts_area_requires_campus_chk CHECK (area_id IS NULL OR campus_id IS NOT NULL),
  CONSTRAINT monthly_forecasts_scope_category_pair_chk CHECK ((scope_id IS NULL AND category_id IS NULL) OR (scope_id IS NOT NULL AND category_id IS NOT NULL)),
  CONSTRAINT monthly_forecasts_quantity_unit_pair_chk CHECK ((predicted_quantity IS NULL AND predicted_unit_id IS NULL) OR (predicted_quantity IS NOT NULL AND predicted_unit_id IS NOT NULL)),
  CONSTRAINT monthly_forecasts_quantity_chk CHECK (predicted_quantity IS NULL OR predicted_quantity >= 0),
  CONSTRAINT monthly_forecasts_co2e_chk CHECK (predicted_co2e_kg IS NULL OR predicted_co2e_kg >= 0),
  CONSTRAINT monthly_forecasts_bounds_chk CHECK (
    (lower_bound IS NULL AND upper_bound IS NULL)
    OR (lower_bound IS NOT NULL AND upper_bound IS NOT NULL AND upper_bound >= lower_bound)
  ),
  CONSTRAINT monthly_forecasts_confidence_chk CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  CONSTRAINT monthly_forecasts_month_uq UNIQUE (model_id,campus_id,area_id,scope_id,category_id,forecast_month)
);
CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  user_id uuid,
  event_type varchar(80) NOT NULL,
  entity_type varchar(80),
  entity_id uuid,
  ip_address varchar(64),
  user_agent text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_events_user_fk FOREIGN KEY (user_id,organization_id) REFERENCES users(id,organization_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT audit_events_event_type_chk CHECK (btrim(event_type)<>'')
);

CREATE INDEX idx_campuses_organization_id ON campuses(organization_id);
CREATE INDEX idx_buildings_campus_id ON buildings(campus_id);
CREATE INDEX idx_areas_campus_name ON areas(campus_id,name);
CREATE INDEX idx_areas_parent_area_id ON areas(parent_area_id);
CREATE INDEX idx_users_campus_id ON users(campus_id);
CREATE UNIQUE INDEX idx_users_org_numeric_id_uq ON users(organization_id,numeric_id) WHERE numeric_id IS NOT NULL;
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE UNIQUE INDEX idx_user_roles_global_uq ON user_roles(user_id,role_id) WHERE campus_id IS NULL;
CREATE UNIQUE INDEX idx_user_roles_campus_uq ON user_roles(user_id,role_id,campus_id) WHERE campus_id IS NOT NULL;
CREATE INDEX idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX idx_user_area_access_user_id ON user_area_access(user_id);
CREATE INDEX idx_user_area_access_area_id ON user_area_access(area_id);
CREATE INDEX idx_units_dimension ON units(dimension);
CREATE INDEX idx_metrics_dimension ON metrics(dimension);
CREATE INDEX idx_emission_categories_scope_name ON emission_categories(scope_id,name);
CREATE INDEX idx_emission_factors_lookup ON emission_factors(category_id,metric_id,denominator_unit_id,valid_from DESC);
CREATE UNIQUE INDEX idx_emission_factors_current_default_uq ON emission_factors(scope_id,category_id,metric_id,denominator_unit_id,COALESCE(region,'GLOBAL'),COALESCE(provider,'UNSPECIFIED')) WHERE is_default AND valid_to IS NULL;
CREATE INDEX idx_assets_campus_type ON assets(campus_id,type);
CREATE UNIQUE INDEX idx_assets_campus_serial_uq ON assets(campus_id,serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX idx_assets_area_id ON assets(area_id);
CREATE INDEX idx_equipment_inventory_area_id ON equipment_inventory(area_id);
CREATE INDEX idx_equipment_inventory_campus_id ON equipment_inventory(campus_id);
CREATE INDEX idx_equipment_inventory_category_type ON equipment_inventory(category_code,ui_type_code);
CREATE INDEX idx_records_org_record_date ON records(organization_id,record_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_records_campus_area_record_date ON records(campus_id,area_id,record_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_records_scope_category_record_date ON records(scope_id,category_id,record_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_records_status ON records(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_records_data_source_id ON records(data_source_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_records_asset_id ON records(asset_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_record_revisions_changed_by_at ON record_revisions(changed_by,changed_at DESC);
CREATE UNIQUE INDEX idx_files_org_checksum_uq ON files(organization_id,checksum_sha256) WHERE checksum_sha256 IS NOT NULL;
CREATE UNIQUE INDEX idx_record_files_primary_uq ON record_files(record_id) WHERE is_primary;
CREATE INDEX idx_targets_scope_category_period ON targets(scope_id,category_id,target_start,target_end) WHERE is_active;
CREATE INDEX idx_target_actions_target_id ON target_actions(target_id);
CREATE INDEX idx_target_actions_status ON target_actions(status);
CREATE INDEX idx_exports_org_created_at ON exports(organization_id,created_at DESC);
CREATE INDEX idx_exports_requested_by_created_at ON exports(requested_by,created_at DESC);
CREATE INDEX idx_notifications_user_status_created_at ON notifications(user_id,status,created_at DESC);
CREATE INDEX idx_profile_change_requests_user_id ON profile_change_requests(user_id);
CREATE INDEX idx_profile_change_requests_status ON profile_change_requests(status,created_at DESC);
CREATE INDEX idx_profile_change_request_events_request_id ON profile_change_request_events(request_id,created_at DESC);
CREATE INDEX idx_iot_devices_campus_id ON iot_devices(campus_id);
CREATE INDEX idx_device_bindings_area_id ON device_bindings(area_id);
CREATE INDEX idx_device_readings_device_recorded_at ON device_readings(device_id,recorded_at DESC);
CREATE INDEX idx_device_readings_created_record_id ON device_readings(created_record_id);
CREATE INDEX idx_ml_predictions_model_target_date ON ml_predictions(model_id,target_date DESC);
CREATE INDEX idx_anomaly_detections_model_detected_at ON anomaly_detections(model_id,detected_at DESC);
CREATE INDEX idx_anomaly_detections_record_id ON anomaly_detections(record_id);
CREATE INDEX idx_monthly_forecasts_model_month ON monthly_forecasts(model_id,forecast_month DESC);
CREATE INDEX idx_monthly_forecasts_scope_category_month ON monthly_forecasts(scope_id,category_id,forecast_month DESC);
CREATE INDEX idx_audit_events_org_created_at ON audit_events(organization_id,created_at DESC);
CREATE INDEX idx_audit_events_user_created_at ON audit_events(user_id,created_at DESC);
CREATE INDEX idx_audit_events_entity ON audit_events(entity_type,entity_id);

CREATE TRIGGER organizations_set_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER campuses_set_updated_at BEFORE UPDATE ON campuses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER buildings_set_updated_at BEFORE UPDATE ON buildings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER areas_set_updated_at BEFORE UPDATE ON areas FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER assets_set_updated_at BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER equipment_inventory_set_updated_at BEFORE UPDATE ON equipment_inventory FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER records_set_updated_at BEFORE UPDATE ON records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER targets_set_updated_at BEFORE UPDATE ON targets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER target_actions_set_updated_at BEFORE UPDATE ON target_actions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER user_settings_set_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER profile_change_requests_set_updated_at BEFORE UPDATE ON profile_change_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER iot_devices_set_updated_at BEFORE UPDATE ON iot_devices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER device_bindings_set_updated_at BEFORE UPDATE ON device_bindings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER ml_models_set_updated_at BEFORE UPDATE ON ml_models FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER metrics_validate_before_write BEFORE INSERT OR UPDATE ON metrics FOR EACH ROW EXECUTE FUNCTION trg_metrics_validate();
CREATE TRIGGER emission_categories_validate_before_write BEFORE INSERT OR UPDATE ON emission_categories FOR EACH ROW EXECUTE FUNCTION trg_emission_categories_validate();
CREATE TRIGGER emission_factors_validate_before_write BEFORE INSERT OR UPDATE ON emission_factors FOR EACH ROW EXECUTE FUNCTION trg_emission_factors_validate();
CREATE TRIGGER records_validate_before_write BEFORE INSERT OR UPDATE ON records FOR EACH ROW EXECUTE FUNCTION trg_records_validate();
CREATE TRIGGER targets_validate_before_write BEFORE INSERT OR UPDATE ON targets FOR EACH ROW EXECUTE FUNCTION trg_targets_validate();
CREATE TRIGGER ml_models_validate_before_write BEFORE INSERT OR UPDATE ON ml_models FOR EACH ROW EXECUTE FUNCTION trg_ml_models_validate();
CREATE TRIGGER ml_predictions_validate_before_write BEFORE INSERT OR UPDATE ON ml_predictions FOR EACH ROW EXECUTE FUNCTION trg_ml_predictions_validate();
CREATE TRIGGER monthly_forecasts_validate_before_write BEFORE INSERT OR UPDATE ON monthly_forecasts FOR EACH ROW EXECUTE FUNCTION trg_monthly_forecasts_validate();

CREATE OR REPLACE VIEW v_frontend_users AS
SELECT
  u.id,
  u.numeric_id,
  u.first_name,
  u.paternal_last_name,
  u.maternal_last_name,
  u.full_name,
  u.email,
  u.notes,
  u.is_active,
  u.last_login_at,
  u.created_at,
  u.updated_at,
  u.organization_id,
  u.campus_id,
  c.code AS campus_code,
  c.name AS campus_name,
  u.area_access_mode,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'areaId', a.id,
        'areaCode', a.code,
        'areaName', a.name
      )
    ) FILTER (WHERE a.id IS NOT NULL),
    '[]'::jsonb
  ) AS area_access
FROM users u
LEFT JOIN campuses c ON c.id = u.campus_id
LEFT JOIN user_area_access uaa ON uaa.user_id = u.id
LEFT JOIN areas a ON a.id = uaa.area_id
GROUP BY u.id, c.code, c.name;

CREATE OR REPLACE VIEW v_frontend_equipment AS
SELECT
  ei.id,
  ei.organization_id,
  ei.campus_id,
  c.code AS campus_code,
  ei.area_id,
  a.code AS area_code,
  a.name AS area_name,
  ei.category_code AS category,
  ei.ui_type_code AS type,
  ei.name,
  ei.quantity,
  ei.power_w,
  jsonb_build_object(
    'hoursPerDay', ei.usage_hours_per_day,
    'daysPerWeek', ei.usage_days_per_week,
    'weeksPerMonth', ei.usage_weeks_per_month
  ) AS usage,
  ei.notes,
  ei.is_active,
  ei.created_at,
  ei.updated_at,
  ei.asset_id
FROM equipment_inventory ei
JOIN campuses c ON c.id = ei.campus_id
JOIN areas a ON a.id = ei.area_id;

CREATE OR REPLACE VIEW v_frontend_records AS
SELECT
  r.id,
  r.organization_id,
  r.record_date AS "dateISO",
  es.code AS scope,
  ec.code AS category,
  m.code AS metric,
  a.name AS area,
  a.code AS "areaCode",
  c.code AS "campusCode",
  r.activity_text AS activity,
  r.activity_text AS "activityText",
  r.quantity_value AS value,
  u.code AS unit,
  r.factor_value_used AS factor,
  r.emission_factor_id AS "factorId",
  r.co2e_kg,
  r.co2e_t,
  r.status,
  r.is_estimated AS "isEstimated",
  ds.name AS source,
  cu.full_name AS "by",
  r.note,
  r.evidence_text AS evidence,
  r.evidence_text AS "evidenceUrl",
  r.created_at AS "createdAt"
FROM records r
JOIN campuses c ON c.id = r.campus_id
JOIN areas a ON a.id = r.area_id
JOIN emission_scopes es ON es.id = r.scope_id
JOIN emission_categories ec ON ec.id = r.category_id
JOIN metrics m ON m.id = r.metric_id
JOIN units u ON u.id = r.unit_id
JOIN data_sources ds ON ds.id = r.data_source_id
JOIN users cu ON cu.id = r.created_by;

COMMIT;
