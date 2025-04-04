# VictoryFairy-backend

안녕하세요! 야구 직관 기록 서비스 ‘승리요정’ 팀입니다!

야구 직관을 기록하고 개인의 직관 승률을 확인할 수 있는 웹 서비스 승리요정을 런칭했습니다.

승리요정 바로가기 : https://www.sngyo.com/

[간략한 소개 및 기능보기](https://github.com/VictoryFairy/VictoryFairy-frontEnd/blob/main/README.md)

## 기술 스택

| 범주                   | 사용 기술                                   |
| ---------------------- | ------------------------------------------- |
| **프레임워크**         | NestJS                                      |
| **데이터베이스**       | PostgreSQL (AWS RDS)                        |
| **캐시**               | Redis                                       |
| **ORM**                | TypeORM                                     |
| **테스트**             | Jest                                        |
| **API 문서화**         | Swagger                                     |
| **서비스 배포**        | AWS Elastic Beanstalk (Docker Compose 기반) |
| **DNS / 로드밸런서**   | Route53 / ALB                               |
| **스테이징 서버 배포** | 홈서버(mac mini m1 기본형) + cloudflare     |

## 폴더 구조

- src/

  - modules/
    비즈니스 도메인을 기준으로 구성된 폴더입니다.
    각 도메인 단위로 controller, service, dto, entity 등을 독립된 모듈로 관리합니다.
  - core/
    설정, AWS, Redis 등과 같이 애플리케이션 전역에서 사용되는 인프라 로직을 담습니다.
  - common/
    NestJS 스타일의 공통 코드(guard, pipe, filter, interceptor, util 등)와 유틸 함수들을 담습니다.
    프레임워크 레벨에서 전역으로 동작하거나 주입되는 요소들입니다.
  - shared/
    여러 도메인에서 함께 사용하는 타입, enum, 공용 DTO 등을 정의합니다.

- tools/
  TypeORM 기반의 시드/마이그레이션 관련 CLI 스크립트와 설정 파일을 모아둔 폴더입니다.
  배포 전후 초기 데이터 구성이나 스키마 반영 시 사용됩니다.
- test/
  유닛 테스트 코드를 모아두는 폴더입니다.

## ERD

<p align='center'>
    <img src="https://github.com/user-attachments/assets/5660ba7d-262a-4c4f-84cf-dde915f6eb7e">
</p>

## 깃 브랜치 전략

- main: 실제 운영 서비스 브랜치
- dev: 스테이징 서버 운영 브랜치
- 기능 개발 시 main 브랜치에서 'feature' 생성 후 개발
- 기능 개발 완료 시 dev에 커밋 머지하여 스테이징 환경에서 테스트
- 프론트엔드 개발 및 연동 테스트 완료 후 문제없으면 feature -> main 커밋 머지 및 운영 배포

## 배포(깃허브 액션)

- 서비스 서버
  - 도커 이미지로 빌드 후 도커 허브 이미지 업로드
  - aws eb docker platform 사용
  - EB에는 레지스트리에서 받아오는 docker-compose.prod.yml 이용해서 배포
- 스테이징 서버
  - 도커 이미지로 빌드 후 도커 허브 이미지 업로
  - 서버는 Mac mini m1이므로 arm64로 이미지 빌드
  - ssh연결 후 docker-compose.stagging.yml 이용하여 배포

## 역할

|                   |                                                                   양기정                                                                    |                                                          허대웅                                                           |
| :---------------: | :-----------------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------: |
| **GitHub 프로필** |                            <img src="https://avatars.githubusercontent.com/EvansKJ57" width="100" height="100">                             |                  <img src="https://avatars.githubusercontent.com/gjeodnd12165" width="100" height="100">                  |
|     **역할**      | - Redis 관련 로직 및 설정 <br/> - 유저, 인증 관련 API <br/> - 랭킹 관련 API <br/> - 개발용 서버 관리 및 운영 <br/> - CI/CD <br/> - AWS 관리 | - 주차장 & 응원가 기능 API <br/> - 경기 일정 크롤링 및 기능 API </br> - 직관 관련 기능 API <br/> - CI/CD <br/> - AWS 관리 |
