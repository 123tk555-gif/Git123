-- 動作確認用のテストデータ。実行するたびに tasks を空にして入れ直す(ID は 1 から付く)。
-- 期限は実行日(current_date)を基準にして、期限切れ・今日・近日・先・なし がそろうようにしている。
TRUNCATE TABLE tasks RESTART IDENTITY;
TRUNCATE TABLE column_sorts;

-- カラムごとの並び順。「完了」は選ばれていない状態(手動として扱われる)のままにしておく。
INSERT INTO column_sorts (status, sort_key) VALUES
('TODO',        'DUE_DATE'),
('IN_PROGRESS', 'PRIORITY');

INSERT INTO tasks (title, status, due_date, priority, category, color, sort_order, created_at) VALUES
('週次レポートの資料を作成する', 'TODO',        current_date + 2,  'HIGH',   '仕事',   'YELLOW', 1, now() - interval '6 days'),
('歯医者の予約を取る',           'TODO',        NULL,              'LOW',    '個人',   'WHITE',  2, now() - interval '5 days'),
('牛乳と卵を買う',               'TODO',        current_date,      'MEDIUM', '買い物', 'GREEN',  3, now() - interval '4 days'),
('英語の単語を50個覚える',       'TODO',        current_date + 7,  'MEDIUM', '勉強',   'BLUE',   4, now() - interval '4 days'),
('請求書を送付する',             'TODO',        current_date - 3,  'HIGH',   '仕事',   'PINK',   5, now() - interval '3 days'),
('メモを整理する',               'TODO',        NULL,              'MEDIUM', NULL,     'WHITE',  6, now() - interval '3 days'),
('会議の議事録をまとめる',       'IN_PROGRESS', current_date + 1,  'HIGH',   '仕事',   'ORANGE', 1, now() - interval '2 days'),
('ランニング30分',               'IN_PROGRESS', NULL,              'LOW',    '個人',   'WHITE',  2, now() - interval '2 days'),
('ReactとSpring Bootの学習',     'IN_PROGRESS', current_date + 14, 'MEDIUM', '勉強',   'BLUE',   3, now() - interval '1 day'),
('資料の誤字をチェックする',     'IN_PROGRESS', current_date + 3,  'LOW',    NULL,     'YELLOW', 4, now() - interval '1 day'),
('プロジェクトの見積もりを提出', 'DONE',        current_date - 5,  'HIGH',   '仕事',   'GREEN',  1, now() - interval '9 days'),
('部屋の掃除',                   'DONE',        NULL,              'LOW',    '個人',   'WHITE',  2, now() - interval '8 days'),
('日用品の買い出し',             'DONE',        current_date - 1,  'MEDIUM', '買い物', 'PINK',   3, now() - interval '7 days');
