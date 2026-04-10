BEGIN;

ALTER TABLE iot_devices
  ADD COLUMN credential_hash varchar(128),
  ADD COLUMN credential_issued_at timestamptz;

CREATE UNIQUE INDEX idx_iot_devices_credential_hash_uq
  ON iot_devices(credential_hash)
  WHERE credential_hash IS NOT NULL;

CREATE UNIQUE INDEX idx_device_readings_device_recorded_at_uq
  ON device_readings(device_id, recorded_at);

COMMIT;
