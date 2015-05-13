var app = {};

// MODELS
app.todo = function(data) {
  data = data || {};
  // data
  this.id = m.prop(data.id || '');
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
      done: todo.done(),
      id: todo.id()
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
  check: function(ctrl, todo, disabled) {
    return m('span.check.clickable', {onclick: disabled ? null : ctrl.toggleDone.bind(null, todo)}, todo.done() ? m('i.fa.fa-check-square-o') : m('i.fa.fa-square-o'));
  },
  edit: function(todo, disabled) {
    return m('span.edit.clickable', {onclick: disabled ? null : todo.editing.bind(null, true)}, m('i.fa.fa-pencil-square-o'));
  },
  remove: function(ctrl, todo, disabled) {
    return m('span.remove.clickable', {onclick: disabled ? null : ctrl.remove.bind(null, todo)}, m('i.fa.fa-times'));
  },
  desc: function(ctrl, todo) {
    return m('span', {className: todo.done() ? 'done': ''}, todo.editing() ? m('form.edit-form.pure-form', {onsubmit: ctrl.editTodo.bind(null, todo)}, [
      m('input', {config: app.c.autofocus, onchange: m.withAttr('value', todo.description), value: todo.description()})
    ]) : todo.description());
  },
  filter: function(desired, filter) {
    return m('a', {config: m.route, className: desired.toLowerCase() === filter.toLowerCase() ? 'selected' : '', href: '/' + desired.toLowerCase()}, desired);
  }
};

// MAIN
app.TodoView = {
  controller: function(args) {
    this.todos = app.todo.list();
    this.todo = new app.todo({id: this.todos.length});
    this.rfilter = (m.route.param('filter') || 'all').toLowerCase();

    this.add = function(e) {
      if(e) e.preventDefault();
      if(!this.todo.description()) return false;
      this.todos.push(this.todo);
      this.todo = new app.todo({id: this.todos.length});
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

    this.editTodo = function(todo, e) {
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
      }).concat([this.todo]);
    }.bind(this);
  },
  view: function(ctrl, args) {
    var itemsLeft = ctrl.todos.filter(function(todo) {
      return !todo.done();
    }).length;
    var phrase = itemsLeft === 1 ? 'item' : 'items';
    return m('div.container', [
      m('h1.header', 'Todo App'),
      m('form.input.pure-form', {onsubmit: ctrl.add}, [
        m('input[type=text][placeholder=description]', {
          oninput: m.withAttr('value', ctrl.todo.description),
          value: ctrl.todo.description()
        })
      ]),
      m('.todos', ctrl.get().map(function(todo, index, todos) {
        var last = todos.length === index + 1;
        return m('.todo', [
          app.v.check(ctrl, todo, last),
          app.v.desc(ctrl, todo),
          app.v.remove(ctrl, todo, last),
          app.v.edit(todo, last)
        ]);
      })),
      m('.info', [
        m('span.left', itemsLeft + ' ' + phrase + ' left'),
        m('span.filters', [
          app.v.filter('All', ctrl.rfilter),
          app.v.filter('Active', ctrl.rfilter),
          app.v.filter('Completed', ctrl.rfilter)
        ]),
        itemsLeft < ctrl.todos.length ? m('a.right.link[href=javascript:void(0)]', {onclick: ctrl.clearDone}, 'Clear Done') : ''
      ])
    ]);
  }
};

m.route.mode = 'hash';
m.route(document.body, '/all', {
  '/:filter': app.TodoView
});
