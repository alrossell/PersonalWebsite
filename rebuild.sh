docker build -t my-go-app .

docker rm -f go-server

docker run -d --name go-server -p 3000:3000 my-go-app
