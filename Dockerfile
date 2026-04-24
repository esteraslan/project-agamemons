# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Salin seluruh file project untuk restore & publish
COPY . .
RUN dotnet restore "agamemons-web.csproj"
RUN dotnet publish "agamemons-web.csproj" -c Release -o /app/publish

# Stage 2: Runtime
# Menggunakan alpine agar image lebih ringan (cocok untuk IT Specialist)
FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
WORKDIR /app

# Install ICU libraries (Penting untuk .NET di Alpine agar tidak error saat handling JSON/Culture)
RUN apk add --no-cache icu-libs
ENV DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false

# 1. Ambil hasil kompilasi (DLL, dependencies)
COPY --from=build /app/publish .

# 2. Salin Asset Statis (HTML, CSS, JS, Audio, Img)
# Docker akan menyalin folder wwwroot beserta isinya
COPY --from=build /src/wwwroot ./wwwroot

# 3. Salin Konfigurasi Penting (.env & Firebase Key)
# Ini krusial agar koneksi ke Gemini & Firestore tidak putus
COPY --from=build /src/.env .
COPY --from=build /src/firebase-key.json .

# 4. Salin Folder Data (stories.json dll)
# Meskipun nanti di-mount via volume di deploy.sh, 
# kita tetap copy sebagai data awal (fallback)
COPY --from=build /src/Data ./Data

# 5. Salin Folder tambahan jika diperlukan (seperti company-wwwroot)
COPY --from=build /src/company-wwwroot ./company-wwwroot

EXPOSE 80
ENTRYPOINT ["dotnet", "agamemons-web.dll"]