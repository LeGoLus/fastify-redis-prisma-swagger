# Fastify-Redis Adapter-Socket.io-Swagger
## Install

```
git clone https://github.com/LeGoLus/fastify-redis-prisma-swagger.git
```

```
npm install -g pnpm
```

```
pnpm install
```

# Requirements

- docker or docker desktop in the workstation
- prisma cli
### check docker version command

```
docker -v
```


## first time 

```
docker compose up --build
```

after run docker finish

```
npx prisma db push
```
## other time

```
docker compose up
```

In the terminal show log the 2 last line in the terminal show
- Server started at http://localhost:3001
- Swagger documentation available at http://localhost:3001/documentation

