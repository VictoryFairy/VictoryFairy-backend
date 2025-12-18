# VictoryFairy-backend

안녕하세요! 야구 직관 기록 서비스 ‘승리요정’ 팀입니다!

야구 직관을 기록하고 개인의 직관 승률을 확인할 수 있는 웹 서비스 승리요정을 런칭했습니다.

승리요정 바로가기 : https://www.sngyo.com/

[간략한 소개 및 기능보기](https://github.com/VictoryFairy/VictoryFairy-frontEnd/blob/main/README.md)

--- 

## 목차

1. [로컬 설치 및 실행](#로컬-실행)
2. [기술 스택](#기술-스택)
3. [아키텍처 설계](#아키텍처-설계)
4. [폴더 구조](#폴더-구조)
5. [ERD](#erd)
6. [깃 브랜치 전략](#깃-브랜치-전략)
7. [배포](#배포깃허브-액션)
8. [인프라 아키텍쳐](#인프라-아키텍쳐)
9. [역할](#역할)


---

## 로컬 실행

1. .env-example에 환경값 넣어주고 .env로 파일이름 변경
2. 아래 명령어 실행

```
docker-compose -f docker-compose.local.yml up -d

npm run start:dev
```

---

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

---

## 아키텍처 설계

### 설계 패러다임

- **Modular Monolith**: 도메인 단위의 모듈화된 모놀리식 구조
- **DDD (Domain-Driven Design)**: Active Record 스타일의 Rich Domain Model 적용
- **CQS (Command Query Separation)**: 명령과 조회의 논리적 책임 분리

### 레이어 구조

프로젝트는 **Common(공통)** 영역과 **Aggregate(도메인 모듈)** 영역으로 구분됩니다.
도메인 모듈은 다시 **Application Layer**와 **Core Layer**로 물리적으로 분리됩니다.

```
Application Layer → Core Layer → Database / Redis
```

- **Application Layer**: 외부 인터페이스(Controller), 흐름 제어, CQS 구현
- **Core Layer**: 도메인 핵심 로직, 데이터 영속성 관리 (DB, Redis)
- **Common Layer**: 모든 레이어에서 참조 가능 (Cross-cutting)

### 의존성 규칙

- `Application Layer`는 `Core Layer`를 의존(Import)합니다.
- `Application Layer`는 각 도메인 `Core Layer`를 의존할 수 있습니다.
- `Core Layer`는 절대로 `Application Layer`를 의존해서는 안 됩니다.
- `Core Layer`는 해당하는 도메인 엔티티에만 의존해야합니다.

### 레이어별 상세 설명

#### Common Layer (`src/common`)

프로젝트 전반의 횡단 관심사(AOP) 및 공통 객체 관리

| 폴더            | 역할                              |
| --------------- | --------------------------------- |
| `decorators/`   | 커스텀 데코레이터 (예: `@User()`) |
| `guards/`       | 인증/인가 가드 (Auth, Role 등)    |
| `interceptors/` | 로깅, 응답 변환 인터셉터          |
| `filters/`      | 전역 예외 필터                    |
| `errors/`       | BaseError 및 공통 에러 상수 정의  |

#### Infrastructure Layer (`src/infra`)

외부 시스템 연동을 위한 공통 인프라 Provider 제공

| 모듈                | 역할                               |
| ------------------- | ---------------------------------- |
| `redis/`            | Redis 연결 관리, Throttler Storage |
| `aws-s3/`           | 파일 업로드/다운로드               |
| `mail/`             | 이메일 발송                        |
| `external-channel/` | Slack, Discord 메시지 전송         |
| `seeder/`           | 초기 데이터 설정                   |

#### Core Layer (`src/modules/*/core`)

도메인 핵심 로직, 데이터 영속성 관리 (DB, Redis)

- **Core Service**: Repository를 사용하여 엔티티 조회/저장, 핵심 비즈니스 로직 수행
- **Redis Service**: 해당 도메인의 캐싱, 세션 관리 등 Redis 로직 캡슐화

#### Application Layer (`src/modules/*/application`)

외부 인터페이스(Controller), 흐름 제어, CQS 구현

| 서비스              | 역할                                                                             |
| ------------------- | -------------------------------------------------------------------------------- |
| **Command Service** | 데이터 생성/수정/삭제, Core Service를 주입받아 도메인 로직 실행 및 트랜잭션 관리 |
| **Query Service**   | 뷰 응답을 위한 조회 전용, EntityManager를 직접 주입받아 성능 최적화              |

#### Worker Module (`src/modules/worker`)

크로스 도메인 백그라운드 작업 (스케줄러, 배치 작업)

- 여러 어그리거트의 데이터를 조합하는 Orchestration Service 역할
- Entity가 없으므로 Core Layer 없이 플랫 구조로 구성

---

## 폴더 구조

```text
src/
├── common/                # Cross-cutting concerns (AOP)
│   ├── decorators/        # Custom Decorators
│   ├── filters/           # Exception Filters
│   ├── guards/            # Auth & Role Guards
│   ├── interceptors/      # Response Transform, Logging Interceptors
│   └── errors/            # Base Error Objects & Constants
│
├── config/                # 전역 설정
│   ├── dotenv.interface.ts
│   ├── database.config.ts
│   └── swagger.config.ts
│
├── infra/                 # Infrastructure Layer (외부 시스템 연동)
│   ├── redis/             # Redis Client Provider (@Global)
│   ├── aws-s3/            # S3 Client Provider
│   ├── mail/              # Mail Transporter Provider
│   ├── external-channel/  # External Channel Provider (Slack, Discord)
│   └── seeder/            # Data Seeder
│
├── modules/               # Domain Modules
│   ├── worker/            # Cross-domain Background Jobs (플랫 구조)
│   │   ├── worker.module.ts
│   │   └── {name}.scheduler.ts
│   │
│   └── {domain}/          # e.g., account
│       ├── application/   # Application Layer (NestJS Module)
│       │   ├── dto/
│       │   ├── controllers/
│       │   ├── services/
│       │   │   ├── {domain}-application.command.service.ts
│       │   │   └── {domain}-application.query.service.ts
│       │   └── {domain}-application.module.ts
│       │
│       └── core/          # Core Layer (NestJS Module)
│           ├── entities/  # Active Record Style Entities
│           ├── services/
│           │   ├── {domain}-core.service.ts
│           │   └── {domain}-redis.service.ts
│           └── {domain}-core.module.ts
│
├── shared/                # 공유 타입, DTO, 상수
│
└── tools/                 # 마이그레이션 및 시드 스크립트

test/                      # E2E 테스트
```

---

## ERD

<img width="1000" alt="Image" src="https://github.com/user-attachments/assets/ada1bb5f-a9cb-495e-a586-0fef1998b364" />

---

## 깃 브랜치 전략

- main: 실제 운영 서비스 브랜치
- dev: 스테이징 서버 운영 브랜치
- 기능 개발 시 main 브랜치에서 분기 생성 후 개발
- 기능 개발 완료 시 dev 브랜치에 머지하여 스테이징 서버 배포
- 프론트엔드 개발,연동 및 테스트 완료 후 문제없으면 분기 브랜치 -> main 머지 및 운영 서버 배포

---

## 배포(깃허브 액션)

- 서비스 서버
  - 도커 이미지로 빌드 후 도커 허브 이미지 업로드
  - aws eb docker platform 사용
  - EB에는 레지스트리에서 받아오는 docker-compose.prod.yml 이용해서 배포
- 스테이징 서버
  - 도커 이미지로 빌드 후 도커 허브 이미지 업로
  - 서버는 Mac mini m1이므로 arm64로 이미지 빌드
  - ssh연결 후 docker-compose.stagging.yml 이용하여 배포

---

## 인프라 아키텍쳐

<img width="1000" alt="Image" src="https://github.com/user-attachments/assets/f3aa3140-4f9c-4eeb-ad03-36ec66e72a17" />

---

## 역할

|                   |                                                                   양기정                                                                    |                                                          허대웅                                                           |
| :---------------: | :-----------------------------------------------------------------------------------------------------------------------------------------: | :-----------------------------------------------------------------------------------------------------------------------: |
| **GitHub 프로필** |                            <img src="https://avatars.githubusercontent.com/EvansKJ57" width="100" height="100">                             |                  <img src="https://avatars.githubusercontent.com/gjeodnd12165" width="100" height="100">                  |
|     **역할**      | - Redis 관련 로직 및 설정 <br/> - 유저, 인증 관련 API <br/> - 랭킹 관련 API <br/> - 개발용 서버 관리 및 운영 <br/> - CI/CD <br/> - AWS 관리 | - 주차장 & 응원가 기능 API <br/> - 경기 일정 크롤링 및 기능 API </br> - 직관 관련 기능 API <br/> - CI/CD <br/> - AWS 관리 |
