"""Sandbox manager orchestrating containerized and isolated document processing."""

import json
import logging
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict, Optional

from app.config import get_settings

logger = logging.getLogger("securedoc.sandbox")
settings = get_settings()


class SandboxManager:
    """Manages secure sandboxed extraction via Docker or local isolated execution."""

    @classmethod
    def is_docker_available(cls) -> bool:
        """Check if Docker daemon is accessible and responding."""
        if not settings.SANDBOX_ENABLED:
            return False
        try:
            import docker
            client = docker.from_env()
            client.ping()
            return True
        except Exception as e:
            logger.debug("Docker daemon ping failed: %s", str(e))
            return False

    @classmethod
    def run_in_docker(cls, input_file_path: str) -> Dict[str, Any]:
        """Execute extraction inside Docker container with restricted resources and no network."""
        import docker

        client = docker.from_env()
        temp_dir = tempfile.mkdtemp(prefix="securedoc_sandbox_", dir=str(settings.SANDBOX_TMP_DIR))
        out_dir = os.path.join(temp_dir, "output")
        in_dir = os.path.join(temp_dir, "input")
        os.makedirs(out_dir, exist_ok=True)
        os.makedirs(in_dir, exist_ok=True)

        target_file_in_sandbox = os.path.join(in_dir, os.path.basename(input_file_path))
        shutil.copyfile(input_file_path, target_file_in_sandbox)

        container = None
        try:
            logger.info("Spawning sandboxed Docker container for %s...", os.path.basename(input_file_path))
            container = client.containers.run(
                image=settings.DOCKER_SANDBOX_IMAGE,
                command=[
                    "--input", f"/input/{os.path.basename(input_file_path)}",
                    "--output", "/output/result.json",
                ],
                volumes={
                    in_dir: {"bind": "/input", "mode": "ro"},
                    out_dir: {"bind": "/output", "mode": "rw"},
                },
                network_mode="none",
                mem_limit=settings.SANDBOX_MEMORY_LIMIT,
                nano_cpus=int(settings.SANDBOX_CPU_LIMIT * 1e9),
                detach=True,
                user="10001",
                remove=False,
            )

            result = container.wait(timeout=settings.SANDBOX_TIMEOUT_SECONDS)
            exit_code = result.get("StatusCode", 1)

            result_file = os.path.join(out_dir, "result.json")
            if os.path.exists(result_file):
                with open(result_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            else:
                logs = container.logs().decode("utf-8", errors="ignore")
                return {
                    "success": False,
                    "errors": [f"Container exited with code {exit_code} without generating output: {logs}"],
                }

        except Exception as e:
            logger.error("Sandbox Docker execution error: %s", str(e))
            return {"success": False, "errors": [f"Docker sandbox failure: {str(e)}"]}
        finally:
            if container:
                try:
                    container.remove(force=True)
                except Exception:
                    pass
            shutil.rmtree(temp_dir, ignore_errors=True)

    @classmethod
    def run_locally(cls, input_file_path: str) -> Dict[str, Any]:
        """Execute sandbox extraction locally with sandbox_entrypoint.py as subprocess."""
        temp_dir = tempfile.mkdtemp(prefix="securedoc_local_sb_", dir=str(settings.SANDBOX_TMP_DIR))
        out_json = os.path.join(temp_dir, "result.json")

        # Locate sandbox_entrypoint.py
        entrypoint_path = settings.BASE_DIR / "sandbox" / "sandbox_entrypoint.py"
        if not entrypoint_path.exists():
            # Try finding relative to current file
            entrypoint_path = Path(__file__).resolve().parent.parent.parent / "sandbox" / "sandbox_entrypoint.py"

        try:
            logger.info("Executing local sandbox subprocess for %s...", os.path.basename(input_file_path))
            cmd = [
                sys.executable,
                str(entrypoint_path),
                "--input", input_file_path,
                "--output", out_json,
            ]
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=settings.SANDBOX_TIMEOUT_SECONDS,
            )

            if os.path.exists(out_json):
                with open(out_json, "r", encoding="utf-8") as f:
                    return json.load(f)
            else:
                return {
                    "success": False,
                    "errors": [
                        f"Local sandbox exited with code {proc.returncode}.",
                        f"Stderr: {proc.stderr}",
                        f"Stdout: {proc.stdout}",
                    ],
                }

        except subprocess.TimeoutExpired:
            return {"success": False, "errors": ["Processing timed out in local sandbox."]}
        except Exception as e:
            logger.error("Local sandbox execution exception: %s", str(e))
            return {"success": False, "errors": [f"Local sandbox exception: {str(e)}"]}
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    @classmethod
    def process_document(cls, file_path: str) -> Dict[str, Any]:
        """Route to Docker sandbox if available, otherwise run safe local sandbox."""
        if cls.is_docker_available():
            return cls.run_in_docker(file_path)
        return cls.run_locally(file_path)
