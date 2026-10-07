# Supabase 이미지 업로드 연결

현재 프로젝트 주소와 공개용 키 연결 대기 상태입니다. 방문자는 로그인하지 않고 이미지 파일을 업로드할 수 있습니다. 기존 GitHub 인증키와 Cloudflare 업로드 서버는 사용하지 않습니다.

1. Supabase 대시보드에서 New project를 선택합니다. Free 조직 아래 이름 `blog-prompt-helper`로 프로젝트를 생성하고 지역은 가까운 곳을 선택합니다. 데이터베이스 비밀번호는 운영자만 보관합니다.
2. 프로젝트 SQL Editor에서 `supabase/setup.sql`을 붙여넣고 Run을 누릅니다. 공개 `blog-images` 저장소와 익명 INSERT 전용 정책이 생성됩니다. 기존 같은 저장소에 다른 허용 정책이 있다면 정책이 함께 적용되므로 확인해야 합니다.
3. 프로젝트 Connect 또는 Settings > Data API에서 프로젝트 주소 `https://...supabase.co`를 찾습니다. Settings > API Keys에서 `sb_publishable_`로 시작하는 Publishable key를 확인합니다.
4. 이 두 공개 설정값만 `supabase-config.js`에 연결합니다. 데이터베이스 비밀번호·`sb_secret_`·service_role 키는 필요하지 않으며 브라우저나 Git에 넣지 않습니다.
5. 실제 파일 업로드, 공개 주소 다운로드, 익명 덮어쓰기·삭제·목록 접근 거부를 확인한 뒤 기존 GitHub Pages에 배포합니다.

파일당 10MB, JPG·PNG·WebP만 허용합니다. 파일명은 UUID이므로 서로 덮어쓰지 않습니다. 공개 다운로드는 저장소 설정에 따라 로그인 없이 가능합니다. 파일 목록 조회·수정·삭제 정책은 추가하지 않습니다. 운영자는 Supabase 대시보드에서 공개 파일을 관리합니다. 로컬 보관함 삭제는 공개 파일을 제거하지 않습니다. 무료 1GB 저장량과 전송량을 공유하므로 운영자는 사용량을 확인해야 합니다. 프런트엔드 제한 외 서버의 MIME·파일 크기·RLS 정책이 적용됩니다.

보관함은 브라우저마다 별도로 유지되며 전체 파일 목록을 공유하지 않습니다. 원본 EXIF는 유지하므로 GPS를 지우려면 기존 4번 섹션에서 GPS 삭제 후 다운로드한 파일을 올립니다.

공식 문서: https://supabase.com/docs/guides/storage/security/access-control 및 https://supabase.com/docs/guides/getting-started/api-keys