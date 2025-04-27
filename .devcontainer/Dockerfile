FROM mcr.microsoft.com/devcontainers/python:1-3.12-bullseye

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
    curl \
    git \
    jq \
    ca-certificates \
    unzip \
    bash-completion \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | tee /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null \
    && apt-get update \
    && apt-get install -y docker-ce-cli \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

RUN chown -R vscode:vscode /workspace

USER vscode

COPY --chown=vscode:vscode requirements.txt .

# Download the latest uv installer
ADD --chown=vscode:vscode https://astral.sh/uv/install.sh /tmp/uv-installer.sh

# Run the uv installer then remove it
RUN sh /tmp/uv-installer.sh && rm /tmp/uv-installer.sh

# Ensure the installed binary is on the `PATH`
ENV PATH="/home/vscode/.local/bin/:$PATH"

RUN bash -c "cd /workspace && uv venv && source .venv/bin/activate && uv pip install fastmcp && uv pip install -r requirements.txt"

