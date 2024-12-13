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

## 역할
|                   | 양기정                                                                                       | 허대웅                                                                                       |
|:-----------------:|:---------------------------------------------------------------------------------------------:|:---------------------------------------------------------------------------------------------:|
| **GitHub 프로필** | <img src="https://avatars.githubusercontent.com/EvansKJ57" width="100" height="100"> | <img src="https://avatars.githubusercontent.com/gjeodnd12165" width="100" height="100"> |
| **역할** | - Redis 관련 로직 및 설정 <br/> - 유저, 인증 관련 API <br/>  - 랭킹 관련 API <br/> - S3이미지 업로드 <br/> - CI/CD <br/>| - 주차장 & 응원가 기능 API <br/> - 경기 일정 크롤링 및 기능 API </br> - 직관 관련 기능 API <br/> - CI/CD <br/> - AWS 관리 |