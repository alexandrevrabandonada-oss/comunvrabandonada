FROM ubuntu:24.04
ARG TIPPECANOE_REF=2.79.0
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends build-essential ca-certificates git libsqlite3-dev zlib1g-dev && rm -rf /var/lib/apt/lists/*
RUN git clone --depth 1 --branch "${TIPPECANOE_REF}" https://github.com/felt/tippecanoe.git /src/tippecanoe && make -C /src/tippecanoe -j2 && make -C /src/tippecanoe install && rm -rf /src/tippecanoe
ENTRYPOINT ["tippecanoe"]
