import { PresetClass } from './types';

export const PRESET_CLASSES: PresetClass[] = [
  {
    id: 'p1',
    className: '예시 학급 (체험용)',
    students: [
      '김철수', '이영희', '박민수', '최지우', '정다은',
      '강하늘', '윤서준', '조유진', '임선우', '한소희',
      '신도윤', '서우진', '오지현', '권민재', '송예린'
    ]
  },
  {
    id: 'p2',
    className: '영재 학급 (토론반)',
    students: [
      'Albert Einstein', 'Marie Curie', 'Isaac Newton', 'Ada Lovelace',
      'Alan Turing', 'Nikola Tesla', 'Charles Darwin', 'Rosalind Franklin'
    ]
  }
];

export const CLASSROOM_TIPS = [
  {
    title: '📸 출석부 사진으로 1초 만에 이름 등록하기',
    content: '모바일 폰이나 카메라로 종이 출석부, 혹은 화면의 명단을 찰깍 찍어서 올려보세요! 우리 구글 제미나이 AI가 사진 속 한글/영어 이름을 기가 막히게 찾아내서 학생 목록에 바로 쏙 넣어드린답니다. 무거운 수작업 끝! ✨'
  },
  {
    title: '🔊 이름 불러주는 TTS 기능',
    content: '학생이 뽑히는 순간, 스피커로 "이번 발표자는 000 학생입니다! 🎉" 하고 음성 안내가 나옵니다. 학생들의 주의를 집중시키고 수업에 더 활기찬 몰입감을 더해줄 수 있어요!'
  },
  {
    title: '🔄 공정함을 위한 "중복 뽑기 제외" 기능',
    content: '한 번 발표한 학생은 다시 뽑히지 않도록 조절할 수 있습니다. 수업 진행 중 모든 학생이 고르게 참여하게 유도할 수 있는 참 편리한 장치예요.'
  }
];
