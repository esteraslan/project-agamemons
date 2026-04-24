#!/bin/bash

docker images agamemons_portal --format "{{.Repository}}:{{.Tag}}" \
| grep -v "latest" \
| sort -r \
| tail -n +4 \
| xargs -r docker rmi
