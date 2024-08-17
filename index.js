import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";
import env from "dotenv";

const app = express();
const port = 3000;
env.config();

// Connect to postgress 
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//function to get date in yyyy-mm-dd format
function getCurrentDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// display home page
app.get('/', async (req, res) => {
  const result = await db.query("SELECT * FROM books ORDER BY id DESC");
  res.render("index.ejs", {books: result.rows});
});

app.get("/book/:id", async (req, res) =>{
  const id = parseInt(req.params.id);
  const result = await db.query("SELECT * FROM books WHERE id = $1",
    [id]
  );
  const foundBook = result.rows[0]
  res.render(`book.ejs`, {book: foundBook});
});

//add new book to DB
app.post('/add', async (req, res) =>{
  const title = req.body.title;
  const author = req.body.author;
  const rating = req.body.rating;
  const description = req.body.description;
  const isbn = req.body.isbn;
  const date = getCurrentDate();
  const cover = null;
  console.log(title, author, rating, date, description, isbn);

  

  try {
    const result = await db.query(
      "INSERT INTO books (title, author, rating, description, isbn, readdate) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;",
      [title, author, rating, description, isbn, date]
    );
    console.log(result.rows[0].id);
    const id = result.rows[0].id
    // res.redirect("/");
    res.redirect(`/book/${id}`);
  } catch (err) {
    console.log(err);
  }
});


app.post("/new", async (req,res) =>{
  const isbn = req.body.isbn;
  try {
    const result = await axios.get(`https://openlibrary.org/search.json?isbn=${isbn}`);
    const title = result.data.docs[0].title;
    const author = result.data.docs[0].author_name[0];
    console.log(title);
    console.log(author);
    res.render("info.ejs", {
      isbn: isbn,
      title: title,
      author: author,
    });
  
  } catch (err) {
      console.log(err)
      const result = await db.query("SELECT * FROM books ORDER BY id DESC");
      res.render("index.ejs", {
        books: result.rows,
        error: "ISBN not found. Enter only digits no hyphens(-) or try another ISBN"
      });
      
      // res.status(404).send(error.response);
    }
});

app.post("/edit", async (req,res) =>{
  if (req.body.editId){
    const result = await db.query("SELECT * FROM books WHERE id = $1 ORDER BY id DESC",
      [req.body.editId]
    );
    res.render("edit.ejs", {book: result.rows[0]});
  } else if (req.body.id && req.body.title && req.body.author && req.body.rating && req.body.description){
    const title = req.body.title;
    const author = req.body.author;
    const rating = req.body.rating;
    const description = req.body.description;
    const id = req.body.id;
    await db.query(
      "UPDATE books SET title = $1, author = $2, rating = $3, description = $4 WHERE id = $5;",
      [title, author, rating, description, id]
    );
    
    res.redirect(`/book/${id}`);
  }
  
});

//Delete book from DB
app.post("/delete", async (req,res) =>{
  const bookId = req.body.deleteId;
  console.log(bookId);
  await db.query(
    "DELETE FROM books WHERE id = $1",
    [bookId]
  );
  res.redirect("/");
});

app.post("/sort", async (req,res) =>{
  if (req.body.title) {
    const result = await db.query("SELECT * FROM books ORDER BY title");
    res.render("index.ejs", {books: result.rows});
    console.log("title");
  } else if (req.body.author){
    const result = await db.query("SELECT * FROM books ORDER BY author");
    res.render("index.ejs", {books: result.rows});
    console.log("author");
  } else if (req.body.rating){
    const result = await db.query("SELECT * FROM books ORDER BY rating DESC");
    res.render("index.ejs", {books: result.rows});
    console.log("rating");
  } else {
    const result = await db.query("SELECT * FROM books ORDER BY id DESC");
    res.render("index.ejs", {books: result.rows});
    console.log("date");
  }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });