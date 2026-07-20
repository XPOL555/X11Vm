FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies, xpra and applications
RUN apt-get update && apt-get install -y \
    software-properties-common \
    wget \
    gnupg2 \
    apt-transport-https \
    xemacs21 \
    dbus-x11 \
    sudo \
    iraf \
    saods9 \
    xfonts-base \
    xfonts-75dpi \
    xfonts-100dpi \
    && rm -rf /var/lib/apt/lists/*

# Add Xpra repository (official) to get the latest version
# Ubuntu 24.04 is "noble"
RUN wget -q https://xpra.org/gpg.asc -O- | apt-key add - && \
    echo "deb https://xpra.org/ noble main" > /etc/apt/sources.list.d/xpra.list && \
    apt-get update && \
    apt-get install -y xpra xterm xfce4-terminal && \
    rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m -s /bin/bash x11vm && \
    echo "x11vm ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers

USER x11vm
WORKDIR /home/x11vm

# Create the mount point for the host volume
RUN mkdir -p /home/x11vm/.x11vm

# Create a simple init script to ensure dbus and xpra run smoothly
RUN echo '#!/bin/bash\nxpra start :100 --bind-tcp=0.0.0.0:10000 --start=xfce4-terminal --no-daemon --dpi=96' > /home/x11vm/start.sh && \
    chmod +x /home/x11vm/start.sh

ENTRYPOINT ["/home/x11vm/start.sh"]
