FROM maven:3.9.11-eclipse-temurin-17-alpine AS build

WORKDIR /workspace
COPY pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-alpine
RUN addgroup -S pixellife && adduser -S pixellife -G pixellife
WORKDIR /app
COPY --from=build /workspace/target/*.jar app.jar
USER pixellife
EXPOSE 10000
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+UseSerialGC"
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
