# タスクボードを1つの Docker イメージにまとめる(画面とサーバーを含む。データベースは別のコンテナ)
# 3段階で作り、最後のイメージには動かすのに必要なものだけを入れる

# 1. 画面(React)を作る
FROM node:24-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# ビルド結果は ../src/main/resources/static(= /app/src/main/resources/static)に出る
RUN npm run build

# 2. サーバー(Spring Boot)を作る。テストは Docker が要るので、ここでは動かさない(手元で mvnw test を行う)
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app
COPY pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY src ./src
COPY --from=frontend /app/src/main/resources/static ./src/main/resources/static
RUN mvn -q -B -DskipTests package

# 3. 動かすためのイメージ(Java の実行環境だけ)
FROM eclipse-temurin:21-jre
WORKDIR /app
RUN useradd --system --uid 10001 taskboard && mkdir -p /app/logs && chown taskboard /app/logs
COPY --from=backend /app/target/taskboard-*.jar /app/taskboard.jar
USER taskboard
# 小さなサーバー(メモリ 1GB 程度)向けに、Java が使うメモリを抑える
ENV JAVA_OPTS="-Xms128m -Xmx256m -XX:+UseSerialGC -XX:MaxMetaspaceSize=128m -Xss512k"
ENV SERVER_ADDRESS=0.0.0.0
EXPOSE 8080
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/taskboard.jar"]
