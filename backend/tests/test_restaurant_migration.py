"""Exercise the new migration against the prior CV schema in a disposable DB."""
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
from sqlalchemy import create_engine, inspect, text
from alembic.migration import MigrationContext
from alembic.operations import Operations


def test_restaurant_upgrade_preserves_existing_cv_rows(tmp_path):
    url = f"sqlite:///{(tmp_path / 'migration.sqlite').as_posix()}"
    env = {**os.environ, "DATABASE_URL": url}
    backend = Path(__file__).resolve().parents[1]
    def upgrade(revision):
        result = subprocess.run([sys.executable, "-m", "alembic", "upgrade", revision], cwd=backend,
                                env=env, capture_output=True, text=True)
        assert result.returncode == 0, result.stderr
    engine = create_engine(url)
    with engine.begin() as connection:
        # Earlier repository migrations require PostgreSQL ALTER CONSTRAINT.
        # Build the exact 0017 CV schema and only its owner/attempt dependencies.
        for table in ("users", "guest_sessions", "atm_scenario_sessions", "bill_scenario_sessions"):
            connection.execute(text(f"CREATE TABLE {table} (id INTEGER PRIMARY KEY)"))
        path = next((backend / "alembic" / "versions").glob("20261001_0017*"))
        spec = importlib.util.spec_from_file_location("prior_cv_migration", path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with Operations.context(MigrationContext.configure(connection)):
            module.upgrade()
        connection.execute(text("CREATE TABLE alembic_version (version_num VARCHAR(32) PRIMARY KEY)"))
        connection.execute(text("INSERT INTO alembic_version VALUES ('20261001_0017')"))
        # SQLite foreign keys are off for this fixture; only migration retention
        # is tested here. API tests separately verify the actual owner linkage.
        connection.execute(text("""INSERT INTO computer_vision_sessions
            (id, public_id, user_id, scenario_key, consent_given, started_at, ended_at, duration_ms, received_at)
            VALUES (1, 'old-cv-record', 999, 'atm-withdrawal', 1, '2026-10-01', '2026-10-01', 0, '2026-10-01')"""))
        connection.execute(text("""INSERT INTO computer_vision_samples
            (session_id, timestamp_ms, is_user_interacting) VALUES (1, 0, 0)"""))
    upgrade("head")
    inspector = inspect(engine)
    assert "restaurant_scenario_sessions" in inspector.get_table_names()
    assert "restaurant_scenario_events" in inspector.get_table_names()
    assert "restaurant_session_id" in {column["name"] for column in inspector.get_columns("computer_vision_sessions")}
    with engine.connect() as connection:
        assert connection.scalar(text("SELECT count(*) FROM computer_vision_sessions")) == 1
        assert connection.scalar(text("SELECT count(*) FROM computer_vision_samples")) == 1
        assert connection.scalar(text("SELECT version_num FROM alembic_version")) == "20261023_0019"
    engine.dispose()


def test_postgresql_restaurant_migration_compiles_without_connecting():
    backend = Path(__file__).resolve().parents[1]
    env = {**os.environ, "DATABASE_URL": "postgresql://migration_test:unused@localhost/migration_test"}
    result = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "20261001_0017:head", "--sql"],
                            cwd=backend, env=env, capture_output=True, text=True)
    assert result.returncode == 0, result.stderr
    assert "CREATE TABLE restaurant_scenario_sessions" in result.stdout
    assert "fk_cv_restaurant_attempt" in result.stdout
