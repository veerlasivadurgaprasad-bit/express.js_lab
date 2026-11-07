DROP TABLE IF EXISTS book;

CREATE TABLE book (
  id INTEGER PRIMARY KEY,
  title TEXT,
  author TEXT,
  price INTEGER,
  pages INTEGER
);

INSERT INTO book (title, author, price, pages) VALUES
  ('Python Crash Course', 'Eric Matthes', 699, 544),
  ('Introduction to Algorithms', 'Thomas H. Cormen', 1850, 1312),
  ('Database System Concepts', 'Abraham Silberschatz', 1250, 1376),
  ('Fluent Python', 'Luciano Ramalho', 1099, 1012),
  ('Computer Networking: A Top-Down Approach', 'James F. Kurose', 975, 864),
  ('Code Complete', 'Steve McConnell', 899, 960),
  ('Data Structures and Algorithms in Java', 'Robert Lafore', 540, 800),
  ('Grokking Algorithms', 'Aditya Bhargava', 420, 256),
  ('Operating System Concepts', 'Abraham Silberschatz', 1150, 1280),
  ('Web Development with Node and Express', 'Ethan Brown', 760, 328);
