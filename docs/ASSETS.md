# 자산 출처와 라이선스

앱에서 사용하는 글꼴은 npm의 `@fontsource` 패키지로 설치해 빌드 산출물에 자체 포함합니다. 실행 중 Google Fonts 등 외부 글꼴 서버나 CDN을 요청하지 않습니다. 아래는 설치된 각 패키지의 `LICENSE`와 `README.md`를 확인한 내역입니다(모두 패키지 버전 5.3.0).

| 글꼴 | 패키지 | 글꼴 라이선스 | LICENSE의 저작권 표시 |
|---|---|---|---|
| Black Han Sans | `@fontsource/black-han-sans` | SIL Open Font License 1.1 | Copyright 2015 The Black Han Sans Project Authors (https://github.com/zesstype/Black-Han-Sans) |
| Do Hyeon | `@fontsource/do-hyeon` | SIL Open Font License 1.1 | Copyright 2018 The Do Hyeon Project Authors |
| Gaegu | `@fontsource/gaegu` | SIL Open Font License 1.1 | Copyright 2018 The Gaegu Project Authors (Regular·Bold도 같은 저작권 표시) |
| Gamja Flower | `@fontsource/gamja-flower` | SIL Open Font License 1.1 | Copyright (c) YoonDesign Inc. All Rights Reserved. |
| Press Start 2P | `@fontsource/press-start-2p` | SIL Open Font License 1.1 | Copyright 2012 The Press Start 2P Project Authors (cody@zone38.net), with Reserved Font Name "Press Start 2P" |

확인 원본은 각각 `node_modules/@fontsource/<패키지명>/LICENSE`, `README.md`입니다. LICENSE 전체의 이용·재배포 조건을 따릅니다. 글꼴 단독 판매는 금지되며, 소프트웨어에 포함해 재배포할 때 저작권 표시와 라이선스를 함께 유지해야 합니다(별도 문서 또는 사용자가 쉽게 볼 수 있는 글꼴 메타데이터 등 LICENSE가 허용하는 방식). 수정한 글꼴의 이름 제한, 특히 Press Start 2P의 Reserved Font Name도 지켜야 합니다. 글꼴 교체·업데이트 시 설치된 패키지 원문을 다시 확인합니다.

게임의 SVG(로봇·블록·월드·지도·favicon, CSS에 포함된 SVG)는 프로젝트 자체 제작 자산입니다. 외부 이미지와 CDN 자산을 사용하지 않습니다. 정적 교사·보호자 안내는 시스템 sans-serif 글꼴과 자체 HTML/CSS만 사용합니다.

## 배포물에 함께 넣는 라이선스 원문

`public/licenses/fonts.txt`에 다섯 글꼴의 LICENSE 원문을 그대로 모았습니다(Claude, 2026-11-21, `node_modules/@fontsource/*/LICENSE` 연결). 빌드하면 `dist/licenses/fonts.txt`로 함께 배포됩니다. 글꼴 패키지를 바꾸면 이 파일도 다시 만듭니다.
