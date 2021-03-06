var app = {};

// MODELS
app.todo = function(data) {
  data = data || {};
  // data
  this.description = m.prop(data.description || '');
  this.done = m.prop(data.done || false);
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
  header: function() {
    var children = [].slice.call(arguments);
    return m('h1.header', children);
  },
  footer: function() {
    var children = [].slice.call(arguments);
    return m('footer', children);
  },
  check: function(args) {
    return m('span.check.clickable', {onclick: args.onclick}, args.checked ? m('i.fa.fa-check-square-o') : m('i.fa.fa-square-o'));
  },
  edit: function(args) {
    return m('span.edit.clickable', {onclick: args.onclick}, m('i.fa.fa-pencil-square-o'));
  },
  remove: function(args) {
    return m('span.remove.clickable', {onclick: args.onclick}, m('i.fa.fa-times'));
  },
  desc: function(args) {
    var todo = args.todo;
    if(args.isEditing) {
      return m('form.edit-form', {onsubmit: args.onedit }, [
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
    // retrieve model data
    this.todos = app.todo.list();

    // setup new todo and filter
    this.todo = new app.todo();
    this.rfilter = (m.route.param('filter') || 'all').toLowerCase();
    this.editIndex = m.prop(-1);

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
        this.editIndex(-1);
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
      app.v.header('Todo App'),
      m('.todo-input', [
        app.v.check({onclick: ctrl.toggleAllDone.bind(null, todos), checked: filteredRemaining === 0 && todos.length > 0}),
        m('form', {onsubmit: ctrl.add}, [
          m('input.todo-input-text[type=text][placeholder=description]', {
            onchange: m.withAttr('value', ctrl.todo.description),
            value: ctrl.todo.description()
          })
        ])
      ]),
      m('.todos', todos.map(function(todo, index) {
        var isEditing = ctrl.editIndex() === index;
        return m('.todo', {className: isEditing ? 'todo-editing' : ''}, [
          // flaoted right
          app.v.remove({onclick: ctrl.remove.bind(null, todo)}),
          app.v.edit({onclick: ctrl.editIndex.bind(null, index)}),
          // regular flow
          app.v.check({onclick: ctrl.toggleDone.bind(null, todo), checked: todo.done()}),
          app.v.desc({onedit: ctrl.edit.bind(null, todo), todo: todo, isEditing: isEditing})
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
      ]),
      app.v.footer('Daniel Loomer ', m.trust('&copy;'), ' 2015')
    ]);
  }
};

m.route.mode = 'hash';
m.route(document.body, '/all', {
  '/:filter': app.TodoView
});
