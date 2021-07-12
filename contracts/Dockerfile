FROM mcr.microsoft.com/dotnet/sdk:5.0

RUN apt update
RUN apt install libsnappy-dev libc6-dev librocksdb-dev vim jq -y
# RUN dotnet tool install -g Neo.Express --version 2.0.39-preview
RUN git clone https://github.com/neo-project/neo-express
WORKDIR /neo-express
RUN dotnet build
WORKDIR /
ENV PATH="$PATH:/root/.dotnet/tools"
RUN ./neo-express/src/neoxp/bin/Debug/net5.0/neoxp create
RUN jq '.settings={"rpc.BindAddress": "0.0.0.0"}' default.neo-express  > "test.json" && mv "test.json" default.neo-express
RUN jq '.magic=1234567890' default.neo-express  > "test.json" && mv "test.json" default.neo-express
ENTRYPOINT ./neo-express/src/neoxp/bin/Debug/net5.0/neoxp run
