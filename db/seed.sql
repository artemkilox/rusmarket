INSERT INTO employees (id, name, role) VALUES
  (1, 'Кузнецова Алина', 'агент'),
  (2, 'Волков Тимур', 'агент'),
  (3, 'Морозова Виктория', 'агент'),
  (4, 'Соколов Артём', 'агент'),
  (5, 'Лебедева Полина', 'агент'),
  (6, 'Новиков Кирилл', 'агент'),
  (7, 'Ерохина Дарья', 'агент'),
  (8, 'Гаврилов Егор', 'агент')
ON CONFLICT (id) DO NOTHING;

INSERT INTO shift_templates (id, name, start_time, end_time, position) VALUES
  ('morning', 'Утро', '07:00', '15:00', 1),
  ('day', 'День', '10:00', '18:00', 2),
  ('evening', 'Вечер', '15:00', '23:00', 3)
ON CONFLICT (id) DO NOTHING;
