#!/usr/bin/env sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_dir=$(dirname "$script_dir")
cd "$project_dir"

if docker container inspect xyzw-web-helper >/dev/null 2>&1; then
  echo "Container xyzw-web-helper already exists; remove or rename it before redeploying."
  exit 1
fi

pnpm run build
docker build --file docker/Dockerfile --tag xyzw-web-helper:latest .
docker run --detach --restart unless-stopped --publish 8080:80 --name xyzw-web-helper xyzw-web-helper:latest
