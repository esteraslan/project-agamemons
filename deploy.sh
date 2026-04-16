# deploy.sh
docker stop agamemons_profile && docker rm agamemons_profile
docker build -t project-personal-site .
docker run -d -p 8080:80 -v $(pwd)/Data:/app/Data --name agamemons_profile project-personal-site
