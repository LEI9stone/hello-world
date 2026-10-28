package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

var errNotFound = errors.New("内容不存在")

type validationError struct{ message string }

func (e validationError) Error() string { return e.message }

type store struct{ db *sql.DB }
type queryer interface {
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func (s *store) init(ctx context.Context) error {
	statements := []string{
		`CREATE TABLE IF NOT EXISTS books (id BIGINT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(200) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		`CREATE TABLE IF NOT EXISTS articles (id BIGINT PRIMARY KEY AUTO_INCREMENT, book_id BIGINT NOT NULL, parent_id BIGINT NULL, unit_name VARCHAR(200) NOT NULL, position INT NOT NULL, title_en VARCHAR(500) NOT NULL, title_zh VARCHAR(500) NOT NULL, INDEX article_order(book_id,position,id), INDEX article_parent(parent_id), FOREIGN KEY(book_id) REFERENCES books(id) ON DELETE CASCADE, CONSTRAINT fk_articles_parent FOREIGN KEY(parent_id) REFERENCES articles(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		`CREATE TABLE IF NOT EXISTS segments (id BIGINT PRIMARY KEY AUTO_INCREMENT, article_id BIGINT NOT NULL, position INT NOT NULL, kind VARCHAR(16) NOT NULL DEFAULT 'text', en MEDIUMTEXT NOT NULL, zh MEDIUMTEXT NOT NULL, INDEX segment_order(article_id,position,id), FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
	}
	for _, stmt := range statements {
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return s.migrate(ctx)
}

// migrate 为已存在的旧库补齐后加的列；没有迁移框架，这里只做幂等的加法。
func (s *store) migrate(ctx context.Context) error {
	var count int
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='segments' AND COLUMN_NAME='kind'`).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		if _, err := s.db.ExecContext(ctx, `ALTER TABLE segments ADD COLUMN kind VARCHAR(16) NOT NULL DEFAULT 'text'`); err != nil {
			return err
		}
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='articles' AND COLUMN_NAME='parent_id'`).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		if _, err := s.db.ExecContext(ctx, `ALTER TABLE articles ADD COLUMN parent_id BIGINT NULL AFTER book_id`); err != nil {
			return err
		}
	}
	if err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='articles' AND CONSTRAINT_NAME='fk_articles_parent'`).Scan(&count); err != nil {
		return err
	}
	if count == 0 {
		_, err := s.db.ExecContext(ctx, `ALTER TABLE articles ADD CONSTRAINT fk_articles_parent FOREIGN KEY(parent_id) REFERENCES articles(id) ON DELETE CASCADE`)
		return err
	}
	return nil
}
func bookByID(ctx context.Context, q queryer, id int64) (Book, error) {
	var b Book
	var first sql.NullInt64
	err := q.QueryRowContext(ctx, `SELECT b.id,b.name,(SELECT COUNT(*) FROM articles a WHERE a.book_id=b.id),
		(SELECT a2.id FROM articles a2 WHERE a2.book_id=b.id AND a2.parent_id IS NULL ORDER BY a2.position,a2.id LIMIT 1)
		FROM books b WHERE b.id=?`, id).Scan(&b.ID, &b.Name, &b.ArticleCount, &first)
	if errors.Is(err, sql.ErrNoRows) {
		err = errNotFound
	}
	if first.Valid {
		b.FirstArticleID = &first.Int64
	}
	return b, err
}
func (s *store) books(ctx context.Context) ([]Book, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT b.id,b.name,COUNT(a.id),
		(SELECT a2.id FROM articles a2 WHERE a2.book_id=b.id AND a2.parent_id IS NULL ORDER BY a2.position,a2.id LIMIT 1)
		FROM books b LEFT JOIN articles a ON a.book_id=b.id GROUP BY b.id,b.name ORDER BY b.id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []Book{}
	for rows.Next() {
		var b Book
		var first sql.NullInt64
		if err = rows.Scan(&b.ID, &b.Name, &b.ArticleCount, &first); err != nil {
			return nil, err
		}
		if first.Valid {
			b.FirstArticleID = &first.Int64
		}
		result = append(result, b)
	}
	return result, rows.Err()
}
func articleByID(ctx context.Context, q queryer, id int64) (Article, error) {
	a := Article{Segments: []Segment{}}
	var parent sql.NullInt64
	err := q.QueryRowContext(ctx, `SELECT a.id,a.book_id,a.parent_id,a.unit_name,a.position,a.title_en,a.title_zh,
		(SELECT COUNT(*) FROM articles c WHERE c.parent_id=a.id)
		FROM articles a WHERE a.id=?`, id).Scan(&a.ID, &a.BookID, &parent, &a.UnitName, &a.Position, &a.Title.En, &a.Title.Zh, &a.ChildCount)
	if errors.Is(err, sql.ErrNoRows) {
		return a, errNotFound
	}
	if err != nil {
		return a, err
	}
	if parent.Valid {
		a.ParentID = &parent.Int64
	}
	rows, err := q.QueryContext(ctx, `SELECT id,position,kind,en,zh FROM segments WHERE article_id=? ORDER BY position,id`, id)
	if err != nil {
		return a, err
	}
	defer rows.Close()
	for rows.Next() {
		var seg Segment
		if err = rows.Scan(&seg.ID, &seg.Position, &seg.Kind, &seg.En, &seg.Zh); err != nil {
			return a, err
		}
		a.Segments = append(a.Segments, seg)
	}
	return a, rows.Err()
}
func (s *store) detail(ctx context.Context, id int64) (Book, []Article, error) {
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true, Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return Book{}, nil, err
	}
	defer tx.Rollback()
	b, err := bookByID(ctx, tx, id)
	if err != nil {
		return b, nil, err
	}
	rows, err := tx.QueryContext(ctx, `SELECT id FROM articles WHERE book_id=? ORDER BY position,id`, id)
	if err != nil {
		return b, nil, err
	}
	ids := []int64{}
	for rows.Next() {
		var aid int64
		if err = rows.Scan(&aid); err != nil {
			rows.Close()
			return b, nil, err
		}
		ids = append(ids, aid)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return b, nil, err
	}
	articles := []Article{}
	for _, aid := range ids {
		a, e := articleByID(ctx, tx, aid)
		if e != nil {
			return b, nil, e
		}
		articles = append(articles, a)
	}
	return b, articles, tx.Commit()
}
func (s *store) article(ctx context.Context, id int64) (Article, error) {
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true, Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return Article{}, err
	}
	defer tx.Rollback()
	a, err := articleByID(ctx, tx, id)
	if err != nil {
		return a, err
	}
	return a, tx.Commit()
}
func lockBook(ctx context.Context, tx *sql.Tx, id int64) error {
	var found int64
	err := tx.QueryRowContext(ctx, `SELECT id FROM books WHERE id=? FOR UPDATE`, id).Scan(&found)
	if errors.Is(err, sql.ErrNoRows) {
		return errNotFound
	}
	return err
}
func (s *store) saveBook(ctx context.Context, id int64, name string) (Book, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Book{}, err
	}
	defer tx.Rollback()
	if id == 0 {
		res, e := tx.ExecContext(ctx, `INSERT INTO books(name) VALUES(?)`, name)
		if e != nil {
			return Book{}, e
		}
		id, err = res.LastInsertId()
		if err != nil {
			return Book{}, err
		}
	} else {
		if err = lockBook(ctx, tx, id); err != nil {
			return Book{}, err
		}
		if _, err = tx.ExecContext(ctx, `UPDATE books SET name=? WHERE id=?`, name, id); err != nil {
			return Book{}, err
		}
	}
	b, err := bookByID(ctx, tx, id)
	if err != nil {
		return b, err
	}
	return b, tx.Commit()
}
func (s *store) deleteBook(ctx context.Context, id int64) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM books WHERE id=?`, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err == nil && n == 0 {
		return errNotFound
	}
	return err
}

// 所有文章变更都先锁定所属书籍，避免追加文章与调整顺序发生竞态。
// parentID 非空时表示作为该文章的小节插入，层级由创建入口决定，编辑不改变。
func (s *store) saveArticle(ctx context.Context, bookID, id int64, parentID *int64, in ArticleInput) (Article, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return Article{}, err
	}
	defer tx.Rollback()
	if id != 0 {
		err = tx.QueryRowContext(ctx, `SELECT book_id FROM articles WHERE id=?`, id).Scan(&bookID)
		if errors.Is(err, sql.ErrNoRows) {
			return Article{}, errNotFound
		}
		if err != nil {
			return Article{}, err
		}
	} else if parentID != nil {
		// 小节随父文章归入同一本书，父文章不存在时直接 404。
		var parentBook int64
		err = tx.QueryRowContext(ctx, `SELECT book_id FROM articles WHERE id=?`, *parentID).Scan(&parentBook)
		if errors.Is(err, sql.ErrNoRows) {
			return Article{}, errNotFound
		}
		if err != nil {
			return Article{}, err
		}
		bookID = parentBook
	}
	if err = lockBook(ctx, tx, bookID); err != nil {
		return Article{}, err
	}
	var parentValue any
	if parentID != nil {
		parentValue = *parentID
	}
	if id == 0 {
		for _, seg := range in.Segments {
			if seg.ID != nil {
				return Article{}, validationError{"新增文章的正文不能指定已有标识"}
			}
		}
		var position int
		if err = tx.QueryRowContext(ctx, `SELECT COALESCE(MAX(position),0)+1 FROM articles WHERE book_id=? AND parent_id <=> ?`, bookID, parentValue).Scan(&position); err != nil {
			return Article{}, err
		}
		res, e := tx.ExecContext(ctx, `INSERT INTO articles(book_id,parent_id,unit_name,position,title_en,title_zh) VALUES(?,?,?,?,?,?)`, bookID, parentValue, in.UnitName, position, in.Title.En, in.Title.Zh)
		if e != nil {
			return Article{}, e
		}
		id, err = res.LastInsertId()
		if err != nil {
			return Article{}, err
		}
	} else {
		var found int64
		if err = tx.QueryRowContext(ctx, `SELECT id FROM articles WHERE id=? FOR UPDATE`, id).Scan(&found); errors.Is(err, sql.ErrNoRows) {
			return Article{}, errNotFound
		}
		if err != nil {
			return Article{}, err
		}
		if _, err = tx.ExecContext(ctx, `UPDATE articles SET unit_name=?,title_en=?,title_zh=? WHERE id=?`, in.UnitName, in.Title.En, in.Title.Zh, id); err != nil {
			return Article{}, err
		}
	}
	rows, err := tx.QueryContext(ctx, `SELECT id FROM segments WHERE article_id=? FOR UPDATE`, id)
	if err != nil {
		return Article{}, err
	}
	existing := map[int64]bool{}
	for rows.Next() {
		var sid int64
		if err = rows.Scan(&sid); err != nil {
			rows.Close()
			return Article{}, err
		}
		existing[sid] = true
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return Article{}, err
	}
	for i, seg := range in.Segments {
		if seg.ID != nil {
			if !existing[*seg.ID] {
				return Article{}, validationError{fmt.Sprintf("第%d组正文标识不属于当前文章", i+1)}
			}
			delete(existing, *seg.ID)
			_, err = tx.ExecContext(ctx, `UPDATE segments SET position=?,kind=?,en=?,zh=? WHERE id=? AND article_id=?`, i+1, seg.Kind, seg.En, seg.Zh, *seg.ID, id)
		} else {
			_, err = tx.ExecContext(ctx, `INSERT INTO segments(article_id,position,kind,en,zh) VALUES(?,?,?,?,?)`, id, i+1, seg.Kind, seg.En, seg.Zh)
		}
		if err != nil {
			return Article{}, err
		}
	}
	for sid := range existing {
		if _, err = tx.ExecContext(ctx, `DELETE FROM segments WHERE id=? AND article_id=?`, sid, id); err != nil {
			return Article{}, err
		}
	}
	a, err := articleByID(ctx, tx, id)
	if err != nil {
		return a, err
	}
	return a, tx.Commit()
}
func (s *store) deleteArticle(ctx context.Context, id int64) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var bid int64
	err = tx.QueryRowContext(ctx, `SELECT book_id FROM articles WHERE id=?`, id).Scan(&bid)
	if errors.Is(err, sql.ErrNoRows) {
		return errNotFound
	}
	if err != nil {
		return err
	}
	if err = lockBook(ctx, tx, bid); err != nil {
		return err
	}
	res, err := tx.ExecContext(ctx, `DELETE FROM articles WHERE id=?`, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return errNotFound
	}
	return tx.Commit()
}
func (s *store) order(ctx context.Context, bid int64, ids []int64) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err = lockBook(ctx, tx, bid); err != nil {
		return err
	}
	rows, err := tx.QueryContext(ctx, `SELECT id FROM articles WHERE book_id=? FOR UPDATE`, bid)
	if err != nil {
		return err
	}
	existing := map[int64]bool{}
	for rows.Next() {
		var id int64
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		existing[id] = true
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	if len(ids) != len(existing) {
		return validationError{"排序必须包含书籍的全部文章且不能重复"}
	}
	for i, id := range ids {
		if !existing[id] {
			return validationError{"排序包含重复标识或不属于当前书籍的文章"}
		}
		delete(existing, id)
		if _, err = tx.ExecContext(ctx, `UPDATE articles SET position=? WHERE id=? AND book_id=?`, i+1, id, bid); err != nil {
			return err
		}
	}
	return tx.Commit()
}
