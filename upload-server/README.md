# 로그인 없는 공개 이미지 업로드 서버

GitHub Pages 프런트엔드는 Cloudflare Worker의 `/upload`에 이미지 바이트를 POST합니다. Worker는 GitHub의 `kingspledu/blog-prompt-images` 공개 저장소에 무작위 경로로 파일을 생성하며, 업로드 커밋에 고정된 raw.githubusercontent.com 주소를 반환합니다. 로그인·비밀번호는 요구하지 않습니다. 보관함은 브라우저마다 별도로 유지되며 전체 공개 파일 목록은 노출하지 않습니다.

## 인증 연결 필요

서버와 저장소는 생성되어 있지만 GitHub 인증키가 연결되지 않아 실제 업로드는 현재 503으로 응답합니다. 프런트엔드 변경은 검증용 브랜치에 보관합니다. 공개 메인 페이지에는 인증 연결과 실 업로드 검증 이후 반영해야 합니다.

권장 인증키: GitHub fine-grained personal access token에서 `kingspledu/blog-prompt-images` 저장소만 선택하고 Contents: Read and write를 허용합니다. 다른 저장소, 관리 및 워크플로 권한은 필요하지 않습니다. 키는 저장소·HTML·클립보드·JSON·커밋에 넣지 말고 다음 명령의 숨겨진 입력으로 직접 등록합니다.

```
wrangler secret put GITHUB_TOKEN --config upload-server/wrangler.jsonc
```

`.dev.vars`, `.env*`, `.wrangler/`는 Git에 포함하지 않습니다. 제한된 이미지 전용 키로 연결하는 것을 권장합니다. 기존 CLI 인증키를 연결하려면 그 키의 다른 저장소 접근 권한과 Cloudflare에 지속적으로 보관되는 점을 사용자가 승인해야 합니다.

## 제한과 관리

파일당 10MB, JPG·PNG·WebP만 허용합니다. 서버에서도 구조를 검사하고 경로·저장소는 서버에 고정합니다. IP당 분당 10회, 전체 분당 30회 업로드 제한을 둡니다. Cloudflare Rate Limit은 위치별 제한이므로 전체에 걸친 절대 상한은 아닙니다. 허용 Origin은 `https://kingspledu.github.io`이며 Origin 검사는 인증을 대신하지 않습니다. 누구나 익명으로 파일을 올릴 수 있습니다.

GitHub 원본 저장에 실패하면 공개 주소를 표시하지 않으며 로컬 보관함에 남겨 재시도할 수 있습니다. 보관함 삭제는 이 브라우저의 사본만 삭제합니다. 공개 파일 제거는 소유자가 GitHub 저장소에서 관리합니다. 공개 커밋 이력에 원본이 남을 수 있으므로 삭제한다고 모든 기존 사본을 회수할 수는 없습니다. 이미지 EXIF는 원본 그대로 유지하므로 위치정보를 지우려면 4번 섹션에서 GPS 삭제 후 다운로드한 이미지를 업로드합니다.

서버 배포: `wrangler deploy --config upload-server/wrangler.jsonc`