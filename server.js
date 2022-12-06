/*********************************************************************************
 * WEB322 – Assignment 06
 * I declare that this assignment is my own work in accordance with Seneca Academic Policy. No part of this
 * assignment has been copied manually or electronically from any other source (including web sites) or
 * distributed to other students. *
 * Name: Vishal Kataria
 * Student ID: 123094211
 * Date: Dec 05, 2022
 * Online (Cyclic) Link: 
 * ********************************************************************************/

const express = require("express");
const path = require("path");
const exphbs = require("express-handlebars");
const clientSessions = require("client-sessions");
const data = require("./modules/collegeData.js");

const app = express();

const HTTP_PORT = process.env.PORT || 8080;
const user = {
  username: "sampleuser",
  password: "samplepassword",
  email: "sampleuser@example.com",
};

function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

app.use(express.static("public"));

app.engine(
  ".hbs",
  exphbs.engine({
    defaultLayout: "main",
    extname: ".hbs",
    helpers: {
      navLink: function (url, options) {
        return (
          "<li" +
          (url == app.locals.activeRoute
            ? ' class="nav-item active" '
            : ' class="nav-item" ') +
          '><a class="nav-link" href="' +
          url +
          '">' +
          options.fn(this) +
          "</a></li>"
        );
      },
      equal: function (lvalue, rvalue, options) {
        if (arguments.length < 3)
          throw new Error("Handlebars Helper equal needs 2 parameters");
        if (lvalue != rvalue) {
          return options.inverse(this);
        } else {
          return options.fn(this);
        }
      },
    },
  })
);

app.set("view engine", ".hbs");

app.use(
  clientSessions({
    cookieName: "cookie",
    secret: "A6_web",
    duration: 4 * 60 * 60 * 1000,
    activeDuration: 1000 * 60,
  })
);

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(function (req, res, next) {
  let route = req.baseUrl + req.path;
  app.locals.activeRoute = route == "/" ? "/" : route.replace(/\/$/, "");
  next();
});

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", function (req, res) {
  res.render("login", { layout: false });
});

app.post("/login", (req, res) => {
  console.log(req.body);
  const username = req.body.username;
  const password = req.body.password;

  console.log(username);
  console.log(password);

  if (username === "" || password === "") {
    return res.render("login", {
      errorMsg: "Missing credentials.",
      layout: false,
    });
  }

  if (username === user.username && password === user.password) {
    req.session.user = {
      username: user.username,
      email: user.email,
    };

    res.redirect("/home");
  } else {
    res.render("login", {
      errorMsg: "invalid username or password!",
      layout: false,
    });
  }
});

app.get("/logout", function (req, res) {
  req.session.reset();
  res.redirect("/login");
});

app.get("/home", ensureLogin, (req, res) => {
  res.render("home");
});

app.get("/about", ensureLogin, (req, res) => {
  res.render("about");
});

app.get("/htmlDemo", ensureLogin, (req, res) => {
  res.render("htmlDemo");
});

app.get("/students", ensureLogin, (req, res) => {
  if (req.query.course) {
    data
      .getStudentsByCourse(req.query.course)
      .then((data) => {
        if (data.length > 0) {
          res.render("students", { students: data });
        } else {
          res.render("students", { message: "no results" });
        }
      })
      .catch((err) => {
        res.render("students", { message: "no results" });
      });
  } else {
    data
      .getAllStudents()
      .then((data) => {
        if (data.length > 0) {
          res.render("students", { students: data });
        } else {
          res.render("students", { message: "no results" });
        }
      })
      .catch((err) => {
        res.render("students", { message: "no results" });
      });
  }
});

app.get("/students/add", ensureLogin, (req, res) => {
  data
    .getCourses()
    .then((data) => {
      res.render("addStudent", { courses: data });
    })
    .catch((err) => {
      res.render("addStudent", { courses: [] });
    });
});

app.post("/students/add", (req, res) => {
  data.addStudent(req.body).then(() => {
    res.redirect("/students");
  });
});

app.get("/student/:studentNum", ensureLogin, (req, res) => {
  // initialize an empty object to store the values
  let viewData = {};
  data
    .getStudentByNum(req.params.studentNum)
    .then((data) => {
      if (data) {
        viewData.student = data; //store student data in the "viewData" object as "student"
      } else {
        viewData.student = null; // set student to null if none were returned
      }
    })
    .catch(() => {
      viewData.student = null; // set student to null if there was an error
    })
    .then(data.getCourses)
    .then((data) => {
      viewData.courses = data; // store course data in the "viewData" object as "courses"
      // loop through viewData.courses and once we have found the courseId that matches // the student's "course" value, add a "selected" property to the matching viewData.courses object
      for (let i = 0; i < viewData.courses.length; i++) {
        if (viewData.courses[i].courseId == viewData.student.course) {
          viewData.courses[i].selected = true;
        }
      }
    })
    .catch(() => {
      viewData.courses = []; // set courses to empty if there was an error
    })
    .then(() => {
      if (viewData.student == null) {
        // if no student - return an error
        res.status(404).send("Student Not Found");
      } else {
        res.render("student", { viewData: viewData }); // render the "student" view
      }
    });
});

app.post("/student/update", (req, res) => {
  data.updateStudent(req.body).then(() => {
    res.redirect("/students");
  });
});

app.get("/courses", ensureLogin, (req, res) => {
  data
    .getCourses()
    .then((data) => {
      if (data.length > 0) {
        res.render("courses", { courses: data });
      } else {
        res.render("courses", { message: "no results" });
      }
    })
    .catch((err) => {
      res.render("courses", { message: "no results" });
    });
});

app.get("/course/:id", ensureLogin, (req, res) => {
  data.getCourseById(req.params.id).then((data) => {
    if (data === undefined) {
      res.status(404).send("Course Not Found");
    } else {
      res.render("course", { course: data });
    }
  });
});

app.get("/courses/add", ensureLogin, (req, res) => {
  res.render("addCourse");
});

app.post("/courses/add", (req, res) => {
  data
    .addCourse(req.body)
    .then(() => {
      res.redirect("/courses");
    })
    .catch((err) => {
      res.status(500).send("Unable to Add Course");
    });
});

app.post("/course/update", (req, res) => {
  data.updateCourse(req.body).then(() => {
    res.redirect("/courses");
  });
});

app.get("/course/delete/:id", ensureLogin, (req, res) => {
  data
    .deleteCourseById(req.params.id)
    .then(() => {
      res.redirect("/courses");
    })
    .catch((err) => {
      res.status(500).send("Unable to Remove Course / Course not found");
    });
});

app.get("/student/delete/:studentNum", ensureLogin, (req, res) => {
  data
    .deleteStudentByNum(req.params.studentNum)
    .then(() => {
      res.redirect("/students");
    })
    .catch((err) => {
      res.status(500).send("Unable to Remove Student / Student not found");
    });
});

app.use((req, res) => {
  res.status(404).send("Page Not Found");
});

data
  .initialize()
  .then(function () {
    app.listen(HTTP_PORT, function () {
      console.log("app listening on: " + HTTP_PORT);
    });
  })
  .catch(function (err) {
    console.log("unable to start server: " + err);
  });
