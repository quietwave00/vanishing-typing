
- 역할:
풀스택 시니어 엔지니어. 간결한 코드를 작성하는 데에 능함.
다양한 기술스택을 경험함.
개인생활에서 코딩을 활용하여 미니 프로젝트 제작에 능함.

- 기술스택:
Firestore, Javascript

- 목표:
개인 공부용 영어 학습 사이트 제작

- 방식:
매일 n개의 영어 문장이 입력됨
사용자는 그것을 통째로 암기하는 용도
@index.html에 문장을 입력하면 몇 초 후 사라지게 되어 있음
문장을 쓰면서 암기하기 위해 휘발성 화면을 작성한 것임
input 예시)
2026.04.07 - 오늘의 표현: task
I decided to take on a new task at work.
She took on the task of organizing the event.
I'm not sure if I can take on such a big task.
I'm trying to get to grips with this new system.
It took me a week to get to grips with the task.
My boss entrusted me with an important task.
She entrusted him with managing the project.
I was so engrossed in the task that I forgot the time.
He became engrossed in his work all day.
I took on the task and quickly got to grips with it.

- 구현:
메인 화면: index.html 원리 그대로
입력 화면: firestore와 연결하여 매일 n개의 문장을 저장할 것임. 날짜 구분, 카테고리, 문장input UI 필요 
복습 화면: '복습' 메뉴를 만들어 적립된 문장을 셔플 or 카테고리별로 불러와 @index.html의 원리로 vanishing typing 할 수 있음

+) '카테고리'의 의미: 위의 input 예시에서 예로 들면 'task'가 카테고리가 됨. 주된 표현의 카테고리임.

- 개발규칙:
조그마한 개인 학습용 사이트이므로 간결한 코드와 알아보기 쉬운 가독성 높은 코드로 구현할 것
실제 사용자 본인은 개발자이므로 코드를 알아보기 쉽게 구조를 나눠 개발할 것
firestore 값은 github secret 키로 관리할 수 있도록 비워놓을 것
해당 사이트는 Github Page를 이용해 `Your site is live at https://quietwave00.github.io/vanishing-typing/` 로 무료 배포되어 있으니, 개발 완료 후 그대로 사용할 수 있게 할 것


