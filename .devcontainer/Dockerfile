FROM mcr.microsoft.com/devcontainers/typescript-node:1-20-bookworm

# Install additional OS packages if needed (e.g., procps for NestJS debugging)
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends procps