# VictoryFairy-backend
승리 요정 앱 승요의 백엔드입니다

## 기술 스택
- NestJS
- TypeORM
- PostgreSQL
- Redis
- Swagger
- JWT
- S3
- Cron
- AWS EB

### 고려 사항
- nginx
- RDS

## 폴더 구조
- 기능 별로 폴더 그룹핑
    - 예시: Controller, Service, Dto, ...
    - Auth 관련은 따로 Auth 폴더에

## 배포
- 도커 이미지로 빌드
- 로컬 테스트 환경에서는 로컬 컴퓨터로 컴포즈 하도록 하기
- 배포용으로 빌드한 이미지를 private registry에 올리기
- EB에는 레지스트리에서 받아오는 docker-compose만을 올려서 배포하기
