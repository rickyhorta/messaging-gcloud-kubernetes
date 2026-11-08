set shell := ["bash", "-uc"]


default:
  @just --list

inventory:
  #!/usr/bin/env bash
  rm -f ansible/inventory.ini
  for node in "frontend" "auth-service" "chat-service" "chat-db"; do
    ip=$(docker inspect --format '{{{{ .NetworkSettings.Networks.chat_net.IPAddress }}' $node)
    echo "$node ansible_host=$ip ansible_user=root ansible_connection=ssh" >> ansible/inventory.ini
  done

gen-ssh-keys:
  #!/usr/bin/env bash
  if [ ! -d ssh-keys ]; then
    mkdir ssh-keys
    ssh-keygen -N "" -f ssh-keys/id_rsa -t rsa -b 2048
  fi

#start inventory + ssh key generation first
start:
  docker build -t mgmt .
  docker run --rm --name mgmt --hostname mgmt -v "$(pwd):/root/project" -d mgmt
  docker exec mgmt bash -c "ssh-keygen -t rsa -b 2048 -f /root/.ssh/id_rsa -q -N ''"

mgmt:
  docker exec -it mgmt bash

ps:
  docker ps

stop:
  docker stop mgmt

clean:
  docker image rm -f mgmt
  rm -rf ssh-keys