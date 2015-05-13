var app = {};

// MODELS
app.todo = function(data) {
  data = data || {};
  // data
  this.description = m.prop(data.description || '');
  this.done = m.prop(data.done || false);
  // view
  // TODO: is this a good pattern?
  this.editing = m.prop(false);
};

app.todo.ns = 'my-mithril-todo';

app.todo.list = function() {
  return app.todo.deserialize(localStorage[app.todo.ns + '.todos'] || '[]');
};

app.todo.deserialize = function(list) {
  return JSON.parse(list).map(function(todo) {
    return new app.todo(todo);
  });
};

app.todo.serialize = function(list) {
  return JSON.stringify(list.map(function(todo) {
    return {
      description: todo.description(),
      done: todo.done()
    };
  }));
};

app.todo.save = function(list) {
  localStorage[app.todo.ns + '.todos'] = app.todo.serialize(list);
};

// CONFIGS
app.c = {
  autofocus: function(elem) {
    elem.focus();
  }
};

// PARTIALS
app.v = {
  check: function(opts, state) {
    return m('span.check.clickable', {onclick: opts.onclick}, state ? m('i.fa.fa-check-square-o') : m('i.fa.fa-square-o'));
  },
  edit: function(opts) {
    return m('span.edit.clickable', {onclick: opts.onclick}, m('i.fa.fa-pencil-square-o'));
  },
  remove: function(opts) {
    return m('span.remove.clickable', {onclick: opts.onclick}, m('i.fa.fa-times'));
  },
  desc: function(opts, todo) {
    if(todo.editing()) {
      return m('form.edit-form', {onsubmit: opts.onedit }, [
        m('input.todo-input-text', {
          config: app.c.autofocus,
          className: todo.done() ? 'done': '',
          onchange: m.withAttr('value', todo.description),
          value: todo.description()
        })
      ]);
    } else {
      return m('span', {className: todo.done() ? 'done': ''}, todo.description());
    }
  },
  filter: function(desired, filter) {
    return m('a', {config: m.route, className: desired.toLowerCase() === filter.toLowerCase() ? 'selected' : '', href: '/' + desired.toLowerCase()}, desired);
  }
};

// MAIN
app.TodoView = {
  controller: function(args) {
    this.todos = app.todo.list();
    this.todo = new app.todo();
    this.rfilter = (m.route.param('filter') || 'all').toLowerCase();

    this.add = function(e) {
      if(e) e.preventDefault();
      if(!this.todo.description()) return false;
      this.todos.unshift(this.todo);
      this.todo = new app.todo();
      this.save();
    }.bind(this);

    this.save = function() {
      app.todo.save(this.todos);
    }.bind(this);

    this.filter = function(fn) {
      this.todos = this.todos.filter(fn);
      this.save();
    }.bind(this);

    this.remove = function(todo) {
      this.filter(function(td) {
        return td !== todo;
      });
    }.bind(this);

    this.toggleDone = function(todo) {
      todo.done(!todo.done());
      this.save();
    }.bind(this);

    this.edit = function(todo, e) {
      if(e) e.preventDefault();
      if(todo.description()) {
        todo.editing(false);
        this.save();
      }
    }.bind(this);

    this.clearDone = function() {
      this.filter(function(todo) {
        return !todo.done();
      });
    }.bind(this);

    this.toggleAllDone = function(todos) {
      var allDone = todos.every(function(todo) {
        return todo.done();
      });
      todos.forEach(function(todo) {
        todo.done(!allDone);
      });
      this.save();
    }.bind(this);

    this.get = function() {
      var filter = this.rfilter;
      return this.todos.filter(function(todo) {
        switch(filter) {
          case 'all':
            return true;
          case 'active':
            return !todo.done();
          case 'completed':
            return todo.done();
        }
      });
    }.bind(this);

    this.countNotDone = function(todos) {
      return todos.filter(function(todo) {
        return !todo.done();
      }).length;
    }.bind(this);

  },
  view: function(ctrl, args) {
    var todos = ctrl.get();
    var filteredRemaining = ctrl.countNotDone(todos);
    var totalRemaining = ctrl.countNotDone(ctrl.todos);
    var phrase = totalRemaining === 1 ? 'item' : 'items';
    return m('div.container', [
      m('h1.header', 'Todo App'),
      m('.todo-input', [
        app.v.check({onclick: ctrl.toggleAllDone.bind(null, todos)}, filteredRemaining === 0 && todos.length > 1),
        m('form', {onsubmit: ctrl.add}, [
          m('input.todo-input-text[type=text][placeholder=description]', {
            onchange: m.withAttr('value', ctrl.todo.description),
            value: ctrl.todo.description()
          })
        ])
      ]),
      m('.todos', todos.map(function(todo, index) {
        return m('.todo', {className: todo.editing() ? 'todo-editing' : ''}, [
          // flaoted right
          app.v.remove({onclick: ctrl.remove.bind(null, todo)}),
          app.v.edit({onclick: todo.editing.bind(null, true)}),
          // regular flow
          app.v.check({onclick: ctrl.toggleDone.bind(null, todo)}, todo.done()),
          app.v.desc({onedit: ctrl.edit.bind(null, todo)}, todo)
        ]);
      })),
      m('.info', [
        m('span.left', totalRemaining + ' ' + phrase + ' left'),
        m('span.filters', [
          app.v.filter('All', ctrl.rfilter),
          app.v.filter('Active', ctrl.rfilter),
          app.v.filter('Completed', ctrl.rfilter)
        ]),
        totalRemaining < ctrl.todos.length ? m('a.right.link[href=javascript:void(0)]', {onclick: ctrl.clearDone}, 'Clear Done') : ''
      ])
    ]);
  }
};

m.route.mode = 'hash';
m.route(document.body, '/all', {
  '/:filter': app.TodoView
});
