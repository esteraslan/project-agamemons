# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
# Kita publish ke folder /app/publish
RUN dotnet publish "agamemons-web.csproj" -c Release -o /app/publish

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
WORKDIR /app

# 1. Ambil hasil kompilasi C# (.dll dll)
COPY --from=build /app/publish .

# 2. PENTING: Salin folder wwwroot secara manual agar CSS/JSON masuk
COPY wwwroot/ ./wwwroot/

EXPOSE 80
ENTRYPOINT ["dotnet", "agamemons-web.dll"]