#!/bin/bash
# EC2(Amazon Linux 2023)を最初に起動したときに1回だけ動く準備。
# Docker を入れ、GitHub からアプリを取得し、体験版を公開用の compose で起動する。
# 2回目以降の起動では、Docker とコンテナ(restart: unless-stopped)が自動で立ち上がる。
set -euxo pipefail

# メモリ 1GB のサーバーでも、イメージを作るときに足りなくならないよう、2GB の予備(スワップ)を作る
if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

dnf install -y docker git
systemctl enable --now docker

# docker compose(Amazon Linux の docker には入っていないので、公式の配布物を入れる)
mkdir -p /usr/local/lib/docker/cli-plugins
ARCH=$(uname -m)
curl -fsSL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-${ARCH}" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# アプリを取得(公開リポジトリの main)
if [ ! -d /opt/git123 ]; then
  git clone --depth 1 https://github.com/123tk555-gif/Git123.git /opt/git123
fi
cd /opt/git123/taskboard

# データベースのパスワードは、このサーバーの中でランダムに作り、外には出さない
if [ ! -f .env ]; then
  umask 077
  printf 'DB_PASSWORD=%s\n' "$(openssl rand -hex 24)" > .env
fi

# イメージを作って起動する
docker build -t taskboard-app .
docker compose -f compose.prod.yaml up -d

echo "taskboard: 準備が終わりました"
