// Material Icons Round 아이콘 이름 상수
// @expo/vector-icons의 MaterialIcons 사용
export const Icons = {
  // 탭바
  bible:    'menu-book',
  group:    'group',
  settings: 'tune',

  // 헤더
  bell:     'notifications',
  profile:  'account-circle',
  back:     'arrow-back',
  invite:   'link',
  more:     'more-vert',

  // 입력 모드
  typing:   'edit',
  photo:    'photo-camera',
  voice:    'mic',
  rub:      'swipe',

  // 상태
  check:    'check-circle',
  checkOutline: 'check-circle-outline',
  trophy:   'emoji-events',
  celebrate:'celebration',
  star:     'star',

  // 모임
  reaction: 'thumb-up',
  pray:     'volunteer-activism',
  comment:  'chat-bubble-outline',
  share:    'ios-share',

  // 기타
  eye:      'visibility',
  eyeOff:   'visibility-off',
  logout:   'logout',
  delete:   'delete-outline',
  lang:     'language',
  close:    'close',
  next:     'arrow-forward',
} as const;

export type IconName = typeof Icons[keyof typeof Icons];
