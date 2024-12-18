
/**
 * Short getElementById wrapper
 */
function gebi(id) {
  return document.getElementById(id);
}
// Script for filter form dynamics.
// This is just here for ease of development.

function openLoading() {
  gebi('loading_overlay').style.display = 'block';
}
function closeLoading() {
  gebi('loading_overlay').style.display = 'none';
}

let cef, cvf;

function updateTasksWithView() {
  const fetchStartTime = performance.now();
  // Fetch new task list.
  let receivedTime;
  request(['fetchTasksWithView', sessionToken, window.currentGroup.groupid, cvf.taskviewid]).then(async data => {
    receivedTime = performance.now();
    if (data.status == 'OK') {
      // Merge task ids
      let taskTags = {};
      data.data.forEach(task => {
        if (!Object.hasOwn(taskTags, task.taskid)) {
          taskTags[task.taskid] = [];
        }
        taskTags[task.taskid].push(task.tagid);
      });
      // Map the tags into Tag objects from the SQL table.
      for (let key in taskTags) {
        taskTags[key] = taskTags[key].map(i => {
          let rr = window.currentGroup.tags;
          for (let v in rr) {
            if (rr[v].tagid == i)
              return rr[v];
          }
        });
      }
      // Now put these tasktags into the Task objects.
      window.data.tasks.forEach((task, i) => {
        if (Object.hasOwn(taskTags, task.taskid)) {
          window.data.tasks[i].tags = taskTags[task.taskid];
        }
      });

      if (!showArchived) {
        // Hide completed tasks.
        let l = window.data.tasks;
        for (let i = l.length - 1; i >= 0; i--) {
          if (l[i].completeddate != null) {
            l.splice(i, 1);
          }
        }
      }
      // Hide tasks not in our group.
      let l = window.data.tasks;
      for (let i = l.length - 1; i >= 0; i--) {
        if (l[i].groupid != currentVaultId) {
          l.splice(i, 1);
        }
      }
      l = window.data.tasks;
      let d = cvf.descincludes == null ? '' : cvf.descincludes;
      let t = cvf.titleincludes == null ? '' : cvf.titleincludes;
      let r = [];
      if (cvf.tagincludes.includes(',')) {
        r = cvf.tagincludes.split(',').map(i => parseInt(i));
      }
      else {
        if (cvf.tagincludes.length > 0) {
          r = parseInt(cvf.tagincludes) + '';
        }
        else {
          r = '';
        }
      }




      //// TASKS RENDERING ////
      /*
        In this section, we are going to render DOM elements
        to the Task View page, according to the current filter
        'cvf', which should already have sorted it in SQL prior.
        Here, we can do additional grouping according to the filter.
      */
      console.log('ARGGG: ' + r);
      let tasks = window.data.tasks;
      for (let zxc = tasks.length - 1; zxc >= 0; zxc--) {
        // Desc includes and title includes and tag includes
        if (d.length > 0) {
          if (tasks[zxc].description.includes(d)) {
            tasks.splice(zxc, 1);
          }
        }
        else if (t.length > 0) {
          if (!tasks[zxc].taskname.includes(t)) {
            tasks.splice(zxc, 1);
          }
        }
        else if (r.length > 0) {
          let sat = false;
          if (Object.hasOwn(tasks[zxc], 'tags')) {
            let tasktg = tasks[zxc].tags.map(tag => tag.tagid);
            tasktg.forEach(v => {
              if (r.includes(v)) {
                sat = true;
              }
            });
          }
          if (!sat) {
            tasks.splice(zxc, 1);
          }
        }
      }
      let groups = {};
      // Here we should put everything in this groups object for the
      // render later.
      let groupby = cvf.groupby;
      if (groupby == 'day') {
        // Try to group by due dates, otherwise default to creation date.
        tasks.forEach(task => {
          let date;
          let duedate = task.duedate;
          if (duedate != null && duedate != '') {
            date = new Date(task.duedate);
          }
          else {
            date = new Date(task.createddate);
          }
          // get day
          let thisGroup = date.toLocaleDateString(options = {
            weekday: "narrow",
            year: "2-digit",
            month: "short",
            day: "numeric",
            dateStyle: "short"
          });
          if (!Object.hasOwn(groups, thisGroup)) {
            groups[thisGroup] = [];
          }
          groups[thisGroup].push(task);
        });
      }
      else if (groupby == 'week') {
        // Try to group by due dates, otherwise default to creation date.
        tasks.forEach(task => {
          let date;
          let duedate = task.duedate;
          if (duedate != null && duedate != '') {
            date = new Date(task.duedate);
          }
          else {
            date = new Date(task.createddate);
          }
          // get week
          let thisGroup = `${new Date(startOfWeek(date)).toLocaleDateString()} - ${new Date(endOfWeek(date)).toLocaleDateString()}`;
          if (!Object.hasOwn(groups, thisGroup)) {
            groups[thisGroup] = [];
          }
          groups[thisGroup].push(task);
        });
      }
      else if (groupby == 'month') {
        // Try to group by due dates, otherwise default to creation date.
        tasks.forEach(task => {
          let date;
          let duedate = task.duedate;
          if (duedate != null && duedate != '') {
            date = new Date(task.duedate);
          }
          else {
            date = new Date(task.createddate);
          }
          // get month
          let thisGroup = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
          if (!Object.hasOwn(groups, thisGroup)) {
            groups[thisGroup] = [];
          }
          groups[thisGroup].push(task);
        });
      }
      else if (groupby == 'year') {
        // Try to group by due dates, otherwise default to creation date.
        tasks.forEach(task => {
          let date;
          let duedate = task.duedate;
          if (duedate != null && duedate != '') {
            date = new Date(task.duedate);
          }
          else {
            date = new Date(task.createddate);
          }
          // get year
          let thisGroup = `${date.getFullYear()}`;
          if (!Object.hasOwn(groups, thisGroup)) {
            groups[thisGroup] = [];
          }
          groups[thisGroup].push(task);
        });
      }
      let sortby = cvf.sortby;
      for (let group in groups) {
        // Time to sort within groups
        if (sortby == 'priority') {
          groups[group].sort((a, b) => {
            return b.priority - a.priority;
          });
        }
        else if (sortby == 'title') {
          groups[group].sort((a, b) => {
            return a.taskname < b.taskname ? -1 : 1;
          });
        }
        else if (sortby == 'duedate') {
          groups[group].sort((a, b) => {
            let aDate, bDate;
            if (a.duedate != null && a.duedate != '') {
              aDate = new Date(a.duedate);
            }
            else {
              aDate = new Date(a.createddate);
            }
            if (b.duedate != null && b.duedate != '') {
              bDate = new Date(b.duedate);
            }
            else {
              bDate = new Date(b.createddate);
            }
            return aDate < bDate ? -1 : 1;
          });
        }
      }
      console.log(groups);
      // Now we can render the groups to the DOM.
      let tl = gebi('tasks-list');
      tl.innerHTML = '';
      let categories = Object.keys(groups);
      categories.sort((a, b) => {
        return compareDesc(b, a);
      });
      for (let zx = 0; zx < categories.length; zx++) {
        let category = categories[zx];
        let childHtmls = [];
        for (let i = 0; i < groups[category].length; i++) {
          let task = groups[category][i];
          let descm = '';
          let descn = '';
          if (task.duedate != null && task.duedate != '') {
            try {
              descn = new Date(task.duedate).toLocaleString();
              descm += 'Due ' + intlFormatDistance(
                new Date(task.duedate),
                new Date()
              );
            }
            catch (e) {
              // most likely the datefns error.
              location.reload();
            }
          }
          else {
            descm += 'Created ' + new Date(task.createddate).toLocaleString();
          }
          let datafeather = '';
          let dfcolor = ''
          let aa = '';
          let bb = '';
          let callB = '';

          if (task.completeddate == null) {
            datafeather = 'circle';
            dfcolor = 'orange';
            bb = 'hidden';
            callB = `markComplete(${task.taskid})`;
          }
          else {
            datafeather = 'check';
            dfcolor = 'green';
            aa = 'hidden';
            callB = `markIncomplete(${task.taskid})`;
          }

          let tagElems = '';
          if (Object.hasOwn(task, 'tags')) {
            task.tags.forEach(tag => {
              tagElems += `
                                  <span class="task-mini-tag" style="${isLightColor(tag.tagcolor) ? 'color: black;' : 'color: white;'}background-color: ${tag.tagcolor};border-color: ${darkenHexColor(tag.tagcolor, 50)};">#${tag.tagname}</span>
                                `;
            });
          }

          childHtmls.push(`
                              <br>
                              <div class="card">
                                <div class="card-body">
                                  ${tagElems}
                                  <div class="row" style="${Object.hasOwn(task, 'tags') && task.tags.length > 0 ? 'margin-top: 20px;' : ''} margin-bottom: 5px;">
                                    <div class="col-6" style="font-family: 'DM Mono', monospace;">
                                      <h5 style="padding:0;margin:0;"><i onclick="${callB}" data-feather="${datafeather}" style="color: ${dfcolor};cursor:pointer;"></i>&nbsp;&nbsp;&nbsp;${task.taskname}</h5>
                                    </div>
                                    <div class="col-6"><i style="color: darkred;" title="Delete" onclick="deleteTask(${task.taskid})" data-feather="trash" class="tricon"></i><i style="color: green;" onclick="dlAttachments(${task.attachmentid})" data-feather="download" class="tricon" ${task.attachmentid == null ? 'hidden' : ''}></i><i onclick="editTask(${task.taskid})" data-feather="edit" class="tricon"></i></div>
                                  </div>
                                  <span style="font-size: 0.91rem; font-family: 'DM Mono', monospace;">${descn}</span>
                                  <p style="font-size: 0.80rem; font-family: 'DM Mono', monospace;${descm.includes('ago') ? 'color: darkred;' : ''}">${descm}</p>
                                  <div class="task-itm-desc container" id="task-sb${task.taskid}" style="width: 100%;">${DOMPurify.sanitize(marked.parse(task.description))}</div>
                                </div>
                              </div>
                            `);
        }
        let oldCategory = category;
        if (category.includes('/') && !category.includes('-')) {
          category = intlFormatDistance(
            category,
            new Date()
            , { unit: 'day' });
          category += ' (' + oldCategory + ')'
          category = category[0].toUpperCase() + category.substring(1);
        }
        let allTogether = childHtmls.join('');
        let categoryDom = `
                            <h5 style="color: black; padding: 10px; border-radius: 10px; font-family: 'DM Mono', monospace;">${category}</h5>
                            <hr>
                            <div class="container">${allTogether}</div><br><br><br>
                          `;
        tl.innerHTML += '<br><br>' + categoryDom;
        feather.replace();
        let listElems = document.getElementsByClassName('task-itm-desc');
        for (let i = 0; i < listElems.length; i++) {
          let elemd = listElems[i];
          let grandchildren = elemd.getElementsByTagName('*');
          for (let j = 0; j < grandchildren.length; j++) {
            let target = grandchildren[j];
            if (target.tagName == 'IMG') {
              target.style = 'width: 100%; border-radius: 5px; cursor: pointer;';
              target.onclick = () => {
                let url = target.getAttribute('src');
                window.open(url, '_blank');
              }
            }
          }
        }
      }

    }

    const finishRenderingTime = performance.now();
    console.log('Task Fetch-Draw performance-')
    console.log(`Client rendering time: ${(finishRenderingTime - receivedTime).toFixed(3)}ms`);
    console.log(`Request-to-response performace time: ${(receivedTime - fetchStartTime).toFixed(3)}ms`);
    console.log(`%cRequest-to-finish time: ${(finishRenderingTime - fetchStartTime).toFixed(3)}ms`, 'color: green;');

  });
}

function markComplete(taskid) {
  request(['mark', sessionToken, true, taskid]).then(data => {
    if (data.status != 'OK') {
      alert('An error has occured.');
      console.log(data);
    }
    else {
      location.reload();
    }
  });
}

function markIncomplete(taskid) {
  request(['mark', sessionToken, false, taskid]).then(data => {
    if (data.status != 'OK') {
      alert('An error has occured.');
      console.log(data);
    }
    else {
      location.reload();
    }
  });
}

function editTask(taskid) {
  pauseScan = true;
  let m = gebi('taskEditorOffcanvas');
  let b = new bootstrap.Offcanvas(m);
  let taskname = gebi('task-name');
  let duedate = gebi('task-duedate');
  let taskprio = gebi('task-priority');
  gebi('task-attachments').value = '';
  gebi('task-editor-btn').innerHTML = 'Edit Task';
  m.setAttribute('data-idd', taskid);
  // Set the values to what the task is.
  window.data.tasks.forEach(task => {
    if (task.taskid == taskid) {
      taskname.value = task.taskname;
      taskDescription.value(task.description);
      if (task.duedate != null) {
        let fsd = new Date(task.duedate);
        fsd.setMinutes(fsd.getMinutes() - fsd.getTimezoneOffset());
        duedate.value = fsd.toISOString().slice(0, 16);
      }
      else
        duedate.value = null;

      taskprio.value = task.priority;
      // Handle tags here.
      if (Object.hasOwn(task, 'tags')) {
        let taskTags = task.tags.map(i => i.tagid);
        window.currentGroup.tags.forEach(tag => {
          let g = gebi(`task-tag-number${tag.tagid}`);
          if (taskTags.includes(tag.tagid)) {
            if (g != null) {
              g.checked = true;
            }
          }
          else {
            if (g != null) {
              g.checked = false;
            }
          }
        });
      }
    }
  });
  m.addEventListener('hide.bs.offcanvas', () => {
    m.removeAttribute('data-idd');
    // Clear form values.
    window.currentGroup.tags.forEach(tag => {
      let g = gebi(`task-tag-number${tag.tagid}`);
      if (g != null) {
        g.checked = false;
      }
      taskname.value = '';
      taskDescription.value('');
      duedate.value = null;
      gebi('task-attachments').value = '';
      taskprio.value = 1;
    });
    pauseScan = false;
  }, { once: true });
  b.toggle();
}

let state = false;

window.addEventListener('load', function () {
  window.pauseScan = false;
  gebi('taskEditorOffcanvas').addEventListener('show.bs.offcanvas', () => {
    state = true;
    pauseScan = true;
  });
  gebi('taskEditorOffcanvas').addEventListener('hide.bs.offcanvas', () => {
    state = false;
    pauseScan = false;
  });
  window.setInterval(() => {
    if (!pauseScan) {
      let m = gebi('taskEditorOffcanvas');
      let b = new bootstrap.Offcanvas(m);
      if (!state) {
        if (m.hasAttribute('data-idd')) {
          m.removeAttribute('data-idd');
        }
        gebi('task-editor-btn').innerHTML = 'Create Task';
        let taskname = gebi('task-name');
        let duedate = gebi('task-duedate');
        let taskprio = gebi('task-priority');
        window.currentGroup.tags.forEach(tag => {
          let g = gebi(`task-tag-number${tag.tagid}`);
          if (g != null) {
            g.checked = false;
          }
        });
        taskname.value = '';
        taskDescription.value('');
        duedate.value = null;
        gebi('task-attachments').value = '';
        taskprio.value = 1;
      }
    }
  }, 1000);
});

function deleteTask(taskid) {
  if (confirm('Are you certain you wish to delete this task?')) {
    request(['deleteTask', sessionToken, taskid]).then(data => {
      if (data.status == 'OK') {
        location.reload();
      }
      else {
        alert('An error has occurred.');
        location.reload();
      }
    });
  }
  else {
    alert('Nothing was deleted.');
  }
}

function dlAttachments(taskid) {
  request(['dl', sessionToken, taskid]).then(data => {
    if (data.status == 'OK') {
      let f = gebi('dldl');
      f.action = `/api/${JSON.stringify([
        'serv',
        sessionToken,
        data.serveId
      ])}`;
      f.method = "post";
      f.target = "_blank";
      f.setAttribute('download', data.serveId);
      f.submit();
      //window.open(`/serv/${data.serveId}`, '_blank').focus();
    }
    else {
      alert('An error has occurred.');
      console.log(data);
    }
  });
}

function sendMsg(taskid) {
  alert(taskid)
}

// update selects
function updateFilterPage() {
  /*
  await sql`CREATE TABLE TaskViews(
    TaskViewID SERIAL PRIMARY KEY,
    FilterName TEXT,
    VaultID INT NOT NULL,
    SortBy TEXT,
    GroupBy TEXT,
    DescIncludes TEXT,
    TitleIncludes TEXT,
    TagIncludes TEXT,
    IsDone BOOLEAN,
    IsNotDone BOOLEAN,
    StartDate TIMESTAMP,
    EndDate TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
        ON DELETE CASCADE
        ON UPDATE CASCADE
  );`
  */
  /*
<li><a class="dropdown-item">Action</a></li>
<li><a class="dropdown-item">Another action</a></li>
<li><a class="dropdown-item">Add new filter</a></li>

  */

  // Add new group
  window.currentGroup.filters.push({
    descincludes: null,
    enddate: null,
    filtername: 'Add new filter',
    groupby: 'day',
    sortby: 'duedate',
    startdate: null,
    tagincludes: "",
    tagquery: null,
    taskviewid: -1,
    titleincludes: null,
    isnotdone: true,
    isdone: false,
    vaultid: window.currentGroup.groupid
  });


  // Let's find the Default filter and set it to the one we are editing.
  window.currentGroup.filters.forEach(filter => {
    if (filter.filtername === 'Default') {
      cef = filter;
    }
  });
  // Check for cvf to see if it's in the cookies.
  cvf = storage.read('cvf');
  if (cvf == -1) {
    // Default to the next available one.
    cvf = window.currentGroup.filters[0];
  }
  else {
    // Check to make sure that the filter still exists.
    let stillExists = false;
    window.currentGroup.filters.forEach(filter => {
      if (filter.taskviewid == cvf.taskviewid) {
        stillExists = true;
        // Keep it up to date.
        cvf = filter;
        storage.write('cvf', filter);
      }
    });
    if (!stillExists) {
      cvf = window.currentGroup.filters[0];
      storage.write('cvf', cvf);
    }
  }
  if (!cef) {
    cef = window.currentGroup.filters[0];
  }

  updateTasksWithView();

  let flist = gebi('filters-edit-list');
  flist.innerHTML = '';
  let g = gebi('taskview-filter');
  g.innerHTML = '';
  window.currentGroup.filters.forEach(filter => {
    let dom = document.createElement('LI');
    dom.innerHTML = `
                        <a class="dropdown-item">${filter.filtername}</a>
                      `;
    dom.onclick = () => {
      cef = filter;
      updateFilterForm();
    };
    dom.style.cursor = 'pointer';
    flist.appendChild(dom);


    // Let's also put it in the task viewer
    if (filter.filtername != 'Add new filter') {
      let bb = document.createElement('OPTION');
      if (filter.taskviewid === cvf.taskviewid) {
        bb.setAttribute('selected', '');
      }
      bb.value = filter.taskviewid;
      bb.innerHTML = filter.filtername;
      g.innerHTML += bb.outerHTML;
    }
  });

  // Are there no filters? This is expected
  // for a first time user to run.
  if (window.currentGroup.filters.length === 1) {
    request(['updateFilter', sessionToken], true, {
      filterId: -1,
      filterName: 'Default',
      vaultid: window.currentGroup.groupid,
      sortBy: 'duedate',
      groupBy: 'day',
      descincludes: null,
      titleincludes: null,
      tagincludes: "",
      isdone: false,
      isnotdone: true,
      startdate: null,
      enddate: null,
    }).then(data => {
      location.reload();
    });
    return;
  }

  updateFilterForm();
}
function updateFilterForm() {
  gebi('filter-title').innerHTML = `Editing <b>${cef.taskviewid === -1 ? 'New' : cef.filtername}</b> filter`;
  let a = gebi('filter-name');
  if (!(cef.taskviewid === -1)) {
    a.value = cef.filtername;
    a.placeholder = '';
  }
  else {
    a.value = '';
    a.placeholder = 'Filter name';
  }
  gebi('filter-groupby').value = cef.groupby;
  gebi('filter-sortby').value = cef.sortby;
  gebi('filter-descincludes').value = cef.descincludes;
  gebi('filter-titleincludes').value = cef.titleincludes;
  let s = gebi('filter-startdate'), e = gebi('filter-enddate');
  if (cef.startdate != null) {
    s.value = new Date(cef.startdate).toISOString().slice(0, 16);
  }
  else {
    s.value = "";
  }
  if (cef.enddate != null) {
    e.value = new Date(cef.enddate).toISOString().slice(0, 16);
  }
  else {
    e.value = "";
  }

  // set the checkboxes
  let v = gebi('filter-isdone'), x = gebi('filter-isnotdone');
  if (cef.isdone) {
    v.checked = true;
  }
  else {
    v.checked = false;
  }
  if (cef.isnotdone) {
    x.checked = true;
  }
  else {
    x.checked = false;
  }

  // Update our exclude tags checkboxes.
  let allTrues = [];
  cef.tagincludes.split(',').forEach(tagId => {
    allTrues.push(parseInt(tagId));
    let a = gebi(`filter-tag-number${tagId}`);
    if (a || a == null) {
      if (a != null)
        a.checked = true;
    }
    else {
      // There is a garbage tag here somewhere (tag deleted)
      // Let's force update the filter.
      updateCurrentFilter();
    }
  });
  // Update the rest of them to false.
  window.currentGroup.tags.forEach(tag => {
    let a = gebi(`filter-tag-number${tag.tagid}`);
    if (!allTrues.includes(parseInt(tag.tagid)) || cef.tagincludes.length == 0) {
      a.checked = false;
    }
  });
}

function updateCurrentFilter() {
  /*
  {
      filterId: -1,
      filterName: 'Default',
      vaultid: window.currentGroup.groupid,
      sortBy: 'duedate',
      groupBy: 'day',
      descincludes: null,
      titleincludes: null,
      tagincludes: null,
      isdone: false,
      isnotdone: true,
      startdate: null,
      enddate: null,
    }
  */
  console.log(FormHero.extractFormContent('filter-form'))
  let data = FormHero.extractFormContent('filter-form');
  if (data.startdate == '') {
    data.startdate = null;
  }
  if (data.enddate == '') {
    data.enddate = null;
  }
  if (!(data.isdone || data.isnotdone)) {
    alert('At least one, "Is Done" or "Is Not Done", must be selected.');
    return;
  }
  let craft = {
    filterId: cef.taskviewid,
    filterName: data.name,
    vaultid: window.currentGroup.groupid,
    sortBy: data.sortby,
    groupBy: data.groupby,
    descincludes: data.descincludes,
    titleincludes: data.titleincludes,
    tagincludes: data.checkedTagIds,
    isdone: data.isdone,
    isnotdone: data.isnotdone,
    startdate: data.startdate,
    enddate: data.enddate
  };
  console.log(craft);
  request(['updateFilter', sessionToken], true, craft).then(d => {
    if (d.status == 'OK') {
      location.reload();
    }
    else {
      alert('An error has occurred.');
      location.reload();
    }
  });
}

function deleteFilter() {
  if (window.currentGroup.filters.length == 2) {
    alert('You cannot delete the last filter. Please make another filter before deleting this one.');
    return;
  }
  if (confirm('Are you certain you want to delete?')) {
    request(['deleteFilter', sessionToken, cef.taskviewid]).then(data => {
      if (data.status === 'OK') {
        alert(`Successfully deleted ${cef.filtername} filter.`);
        location.reload();
      }
    });
  }
  else {
    alert('Nothing has been deleted.');
  }
}



function changeUsername() {
  let pt = prompt('Enter new username: ');
  if (pt != null && pt.length >= 1) {
    request(['editUser', sessionToken], true, {
      passwordhash: null,
      salt: null,
      username: pt,
      hex: null,
      ext: null
    }).then(data => {
      if (data.status == 'OK') {
        location.reload();
      }
      else {
        alert('An error has occurred.');
        location.reload();
      }
    })
  }
}

async function changePassword() {
  let ad = gebi('password-1'), ae = gebi('password-2');
  let pt = ad.value, pt2 = ae.value;
  if (pt != null && pt.length > 6 && pt2 != null && pt2.length > 6) {
    if (pt == pt2) {
      let salt = Buffer.from(crypto.getRandomValues(new Uint8Array(8))).toString('hex');
      const hash = Buffer.from(new Uint8Array(await window.crypto.subtle.digest('SHA-512', new TextEncoder().encode(pt + salt)))).toString('hex');
      request(['editUser', sessionToken], true, {
        passwordhash: hash,
        passwordsalt: salt,
        username: null,
        hex: null,
        ext: null
      }).then(data => {
        if (data.status == 'OK') {
          location.reload();
        }
        else {
          alert('An error has occurred.');
          console.log(data);
          //location.reload();
        }
      });
    }
    else {
      alert(`Passwords do not match, please try again.`);
    }
  }
  else {
    alert('Password must be >6 characters, invalid input.');
  }
}

function uploadPfp() {
  let input = document.createElement('input');
  input.type = 'file';
  input.onchange = e => {
    console.log(input.files);
    let fileReader = new FileReader();
    let file = input.files[0];
    function d(e) {
      alert(`Error reading file ${file.name}, skipping file.`);
      console.error(e);
    }
    fileReader.onerror = d;
    fileReader.onabort = d;
    fileReader.onloadend = data => {
      let compatTypes = [
        'image/apng',
        'image/gif',
        'image/jpeg',
        'image/png',
        'image/svg+xml',
        'image/webp'
      ];
      let type = file.type;
      if (!compatTypes.includes(type)) {
        alert('Invalid image type. Must be of type(s): ' +
          compatTypes.map(i => i.replace('image/', '')).join(', ')
        );
      }
      else {
        request(['editUser', sessionToken], true, {
          passwordhash: null,
          salt: null,
          username: null,
          hex: Buffer.from(new Uint8Array(fileReader.result)).toString('hex'),
          ext: file.type.replace('image/', '')
        }).then(data => {
          if (data.status == 'OK') {
            location.reload();
          }
          else {
            alert('An error has occurred.');
            location.reload();
          }
        });
      }
    }
    fileReader.readAsArrayBuffer(file);
  }
  input.click();

}


function darkenHexColor(hex, amount = 20) {
  // Remove the '#' if it exists
  hex = hex.replace('#', '');

  // Parse the hex color into its RGB components
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // Decrease each color component by the amount, clamping to 0
  r = Math.max(r - amount, 0);
  g = Math.max(g - amount, 0);
  b = Math.max(b - amount, 0);

  // Convert back to a hex string and return
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}


let storage = {
  write: (key, value) => {
    localStorage.setItem(key, JSON.stringify([value]));
  },
  read: key => {
    if (localStorage.getItem(key) == null) {
      return -1;
    }
    return JSON.parse(localStorage.getItem(key))[0];
  },
  delete: key => {
    localStorage.removeItem(key);
  },
  clear: () => {
    localStorage.clear();
  }
}



/**
 * 
 * NOTE: nanoid is a library function made by Andrey Sitnik,
 * I am using it here with proper attribution.
 * 
 * Copyright 2017 Andrey Sitnik <andrey@sitnik.ru>
 * License: https://github.com/ai/nanoid/blob/main/LICENSE
 * 
 * @param {int} e 
 * @returns string
 */
const nanoid = (e = 21) => {
  let a = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
  let t = "", r = crypto.getRandomValues(new Uint8Array(e));
  for (let n = 0; n < e; n++) {
    t += a[63 & r[n]];
  }
  return t;
}

Coloris({
  themeMode: 'pill',
  alpha: false
});

feather.replace();

// Global clock renderer.
window.setInterval(() => {
  let f = new Date();
  let p = gebi('clock-statement');
  if (window.data) {
    p.innerHTML =
      `${f.toLocaleString()} (${window.data.tasks.length} tasks)`;
  }

  // Also global tasks update here.
  if (f.getSeconds() == 0) {
    updateTasksWithView();
  }
}, 1000);


let FormHero = {
  /**
   * Extracts all inputs from a form (including the option boxes).
   */
  extractFormContent: id => {
    let parent = gebi(id);
    let children = parent.getElementsByTagName('*');
    let formInputs = {};
    formInputs['checkedTagIds'] = [];
    for (let child of children) {
      if (child.tagName === 'INPUT') {
        let id = child.id, name = child.name, value = child.value;
        if (id.includes('tag-number')) {
          if (child.checked) {
            formInputs['checkedTagIds'].push(parseInt(id.split('-')[2].replace("number", '')));
          }
        }
        if (child.type == 'checkbox') {
          value = child.checked;
        }
        if (name) {
          formInputs[name.split('-')[1]] = value;
        }
        else {
          formInputs[id.split('-')[1]] = value;
        }
      }
      else if (child.tagName === 'SELECT') {
        formInputs[child.id.split('-')[1]] = child.value;
      }
    }
    delete formInputs.tag;
    return formInputs;
  }
};

let abcba = gebi('taskview-showarchived');
window.showArchived = storage.read('showarchived');
if (window.showArchived != -1) {
  abcba.checked = window.showArchived;
}
else {
  window.showArchived = abcba.checked;
}

// Equivalent to NodeJS from buffer.
const Buffer = window.Buffer.Buffer;

let currentPage = 'auth';

let abcbc = gebi('taskview-filter')
abcbc.onchange = () => {
  let newVal = parseInt(abcbc.value); // This is the filterID
  // Change the cvf
  window.currentGroup.filters.forEach(filter => {
    if (filter.taskviewid === newVal) {
      cvf = filter;
      storage.write('cvf', cvf);
    }
  });
  // TO-DO: Apply a view over the Tasks we are looking at (refresh task list).
}
abcba.onchange = () => {
  window.showArchived = !window.showArchived;
  storage.write('showarchived', window.showArchived);
  abcba.checked = window.showArchived;

  refreshClient();
  updateTasksWithView();
}

function changePage(newPage) {
  if (currentPage != newPage) {
    if (currentPage != 'main-view') {
      gebi(currentPage).style.display = 'none';
    }
    gebi(newPage).style.display = 'block';
    // Remove active element class.
    if (newPage.includes('view')) {
      gebi(`${currentPage}-item`).classList.remove('active');
      gebi(`${newPage}-item`).classList.add('active');
      location.hash = newPage;
    }
    currentPage = newPage;
  }
}

let sessionToken = storage.read('sessionToken');
let currentVaultId = storage.read('currentVaultId');
let uid = -1;

if (sessionToken != -1) {
  changePage('main-page'); //main menu
  currentPage = 'tasks-view';
  // This lets us keep the app page open on a refresh or bookmark
  let locHash = location.hash.substring(1);
  if (gebi(`${locHash}`) != null) {
    changePage(locHash);
  }
  // Update.
  refreshClient();
}

function addPersonToVault(vid) {
  let userid = prompt('Please enter their user code: ');
  if (userid != null && userid.length == 21) {
    request(['addUserToGroup', sessionToken, userid, vid]).then(data => {
      if (data.status == 'OK') {
        location.reload();
      }
      else if (data.status == 'USERNOTFOUND') {
        alert('Invalid user code.');
      }
      else if (data.status == 'INGROUP') {
        alert('User is already in this vault.');
      }
      else {
        alert('An error has occurred.');
      }
    });
  }
  else {
    alert('Invalid user code.');
  }
}

function createNewUser() {
  let username = prompt('Please enter a username: ');
  if (!(username != null && username.length >= 1)) {
    alert('Invalid username, user not created.');
    return;
  }
  request(['createNewUser', sessionToken, username]).then(data => {
    if (data.status == 'OK') {
      navigator.clipboard.writeText(data.password);
      alert(`User ${username} has been created with password: ${data.password} (copied to clipboard)`);
    }
    else if (data.status == 'USEREXISTS') {
      alert('Username already exists.');
    }
    else {
      alert('An error has occurred.');
      location.reload();
    }
  });
}

function createNewGroup() {
  let groupName = prompt('Enter your new vault name: ');
  if (!(groupName == null || groupName.length == '')) {
    request(['createNewGroup', sessionToken, groupName]).then(data => {
      if (data.status == 'OK') {
        location.reload();
      }
      else {
        alert('An error has occurred.');
        location.reload();
      }
    });
  }
}

/**
 * Create a new task
 */
function createNewTask() {

  let isEdit = false;
  let isEditId = -1;
  // Let's check if this is an edit actually.
  let gx = gebi('taskEditorOffcanvas');
  if (gx.hasAttribute('data-idd')) {
    isEdit = true;
    isEditId = parseInt(gx.getAttribute('data-idd'));
  }

  // Form values
  let taskName = gebi('task-name').value, taskDesc = taskDescription.value(), dueDate = gebi('task-duedate').value,
    taskPrio = gebi('task-priority').value, attachments = gebi('task-attachments').files;
  console.log(attachments);
  let fileData = {};
  if (!dueDate) {
    dueDate = null;
  }
  // We want to read all the files and their data
  let vk = window.setInterval(() => {
    if (Object.keys(fileData).length == Object.keys(attachments).length) {
      // We have finished reading all files as hex.
      console.log(fileData);
      // Now let's compile all the tags we want to look for.
      let tagIDs = window.currentTags.map(i => i.tagid);
      let taskTags = [];
      tagIDs.forEach(id => {
        if (gebi(`task-tag-number${id}`).checked) {
          taskTags.push(id);
        }
      });
      if (isEdit) {
        let dd = new Date(dueDate).toISOString();
        if (dueDate == null) {
          dd = null;
        }
        request(['updateTask', sessionToken, taskName, dd, taskPrio, isEditId], true, {
          tags: taskTags,
          attachments: fileData,
          desc: taskDesc,
          groupid: window.currentGroup.groupid
        }).then(data => {
          if (data.status == 'OK') {
            console.log(taskTags);
            location.reload();
          }
          else {
            alert('An error has occurred while creating this task.');
            console.log(window.data);
            location.reload();
          }
        });
      }
      else {
        let dd = new Date(dueDate).toISOString();
        if (dueDate == null) {
          dd = null;
        }
        request(['createNewTask', sessionToken, taskName, dd, taskPrio], true, {
          tags: taskTags,
          attachments: fileData,
          desc: taskDesc,
          groupid: window.currentGroup.groupid
        }).then(data => {
          console.log(data);
          if (data.status == 'OK') {
            location.reload();
          }
          else {
            alert('An error has occurred while creating this task.');
            location.reload();
          }
        });
      }
      window.clearInterval(vk);
    }
  }, 200);
  // Iterate through all attachment Files, reading them as ArrayBuffers and convert them into hex using the Buffer library.
  Object.keys(attachments).forEach(key => {
    let fileReader = new FileReader();
    let file = attachments[key];
    function d(e) {
      alert(`Error reading file ${file.name}, skipping file.`);
      console.error(e);
    }
    fileReader.onerror = d;
    fileReader.onabort = d;
    fileReader.onloadend = data => {
      fileData[file.name] = {
        lastModified: file.lastModified,
        size: file.size,
        type: file.type,
        hexData: Buffer.from(new Uint8Array(fileReader.result)).toString('hex')
      };
    }
    fileReader.readAsArrayBuffer(file);
  });
}

/**
 * Send API request to create new tag for the vault.
 */
function createNewTag() {
  let d = gebi('tag-name'), c = gebi('tag-color');
  request(['createNewTag', sessionToken, currentVaultId, d.value, c.value]).then(data => {
    d.value = '';
    c.value = '';
    if (data.status === 'ERROR' || data.status === 'INVALID') {
      alert('An error has occurred. The app will restart now.');
      storage.clear();
      location.reload();
    }
    else {
      refreshClient();
    }
  });
}

function deleteTag(tagId, all = false) {
  //console.log(tagId); 
  let verifyCheck = false;
  if (all) {
    verifyCheck = window.prompt(`Please enter "delete all" to confirm.`) === 'delete all' ? true : false;
  }
  else {
    verifyCheck = window.prompt(`Please enter "delete" to confirm.`) === 'delete' ? true : false;
  }
  if (!verifyCheck) {
    alert('Nothing was deleted.');
    return;
  }
  else {
    request(['deleteTag', sessionToken, tagId, all]).then(data => {
      if (data.status == 'ERROR' || data.status == 'INVALID') {
        alert('An error has occurred. The app will restart now.');
        storage.clear();
      }
      location.reload();
    });
  }
}

function editTag() {
  if (currentEditingTag == null) {
    // We have nothing to edit
    location.reload();
  }
  else {
    let tagId = currentEditingTag;
    currentEditingTag = null;
    let newName = gebi('tag2-name').value, newColor = gebi('tag2-color').value;
    request(['updateTag', sessionToken, tagId, newName, newColor]).then(data => {
      if (data.status == 'ERROR' || data.status == 'INVALID') {
        alert('An error has occurred. The app will restart now.');
        storage.clear();
      }
      location.reload();
    });
  }
}

/**
 * Returns true if the hex color is bright.
 * 
 * DISCLAIMER: The following function below was written by
 * EliseoPlunker and GuTheR on StackOverflow under the
 * CreativeCommons Attribution-ShareAlike 4.0 International license
 * 
 * Link to author post: https://stackoverflow.com/a/77647094
 * No modifications have been made to this code.
 * 
 **/
function isLightColor(color) {
  if (color.length == 7) {
    const rgb = [
      parseInt(color.substring(1, 3), 16),
      parseInt(color.substring(3, 5), 16),
      parseInt(color.substring(5), 16),
    ];
    const luminance =
      (0.2126 * rgb[0]) / 255 +
      (0.7152 * rgb[1]) / 255 +
      (0.0722 * rgb[2]) / 255;
    return luminance > 0.5;
  }
  return false;
}

function gotoVault(groupid) {
  window.data.groups.forEach(group => {
    if (group.groupid == groupid) {
      window.currentGroup = group;
      storage.write('currentVaultId', groupid);
      location.reload();
    }
  });
}

function editVault(groupid) {
  let newName = prompt('Enter new vault name: ');
  if (!(newName == null || newName.length == 0)) {
    request(['updateGroupName', sessionToken, groupid, newName]).then(data => {
      if (data.status == 'OK') {
        location.reload();
      }
      else if (data.status == 'INVALID') {
        alert('You do not have permission to perform this action.');
      }
      else if (data.status == 'ERROR') {
        alert('An error has occurred while performing this action.');
        location.reload();
      }
    });
  }
}

function deleteVault(groupid) {
  let search;
  window.data.groups.forEach(group => {
    if (group.groupid == groupid) {
      search = group.groupname;
    }
  })
  let pt = prompt(`Please type ${search} to confirm you want to delete.`);
  if (pt != search) {
    alert('Nothing was deleted.');
  }
  else {
    request(['deleteGroup', sessionToken, groupid]).then(data => {
      if (data.status == 'OK') {
        location.reload();
      }
      else if (data.status == 'CANNOTDELETE') {
        alert('Cannot delete your last vault.');
      }
      else if (data.status == 'INVALID') {
        alert('You do not have permission to perform this action.')
        location.reload()
      }
      else {
        alert('An error has occurred.');
      }
    });
  }
}

function removeUserFromGroup(userid) {
  request(['removeUser', sessionToken, userid, window.currentGroup.groupid]).then(data => {
    if (data.status == 'OK') {
      location.reload();
    }
    else {
      alert('An error has occurred.');
      location.reload();
    }
  });
}

function refreshClient() {
  let fetchStartTime = performance.now();
  request(['getClientPackageUpdate', sessionToken]).then(data => {
    let receivedTime = performance.now();
    if (data.status === 'INVALID') {
      storage.clear();
      location.reload();
    }
    else {

      window.data = data;
      // Set our uid
      uid = data.me.userid;
      // Set pfp for every location.
      let pd = data.me.pfp;
      console.log(data);
      let fileExt = pd.fileName.split('.')[1];
      let pdEmbedData = `data:image/${fileExt};base64,${Buffer.from(pd.hexData, 'hex').toString('base64')}`
      let doms = document.getElementsByClassName('self-pfp');
      for (let i = 0; i < doms.length; i++) {
        let item = doms[i];
        item.src = pdEmbedData;
      }
      // Set current vault if not exist before.
      if (currentVaultId === -1) {
        currentVaultId = data.groups[0].groupid;
        window.currentGroup = data.groups[0];
        storage.write('currentVaultId', currentVaultId);
      }
      else {
        for (let i = 0; i < data.groups.length; i++) {
          if (data.groups[i].groupid == currentVaultId) {
            window.currentGroup = data.groups[i];
          }
        }
        if (typeof window.currentGroup == "undefined") {
          currentVaultId = data.groups[0].groupid;
          window.currentGroup = data.groups[0];
          storage.write('currentVaultId', currentVaultId);
        }
      }
      let htmlList = '';
      window.currentGroup.users.forEach(user => {
        let pd = user.pfp;
        let fileExt = pd.fileName.split('.')[1];
        let pdEmbedData = `data:image/${fileExt};base64,${Buffer.from(pd.hexData, 'hex').toString('base64')}`
        let dm = `
            <br>
              <div class="card">
                <div class="card-body">
                  <div class="row">
                    <div class="col-10">
                      <h5>${user.username} &nbsp;<span style="background-color:lightblue;padding:5px;border-radius:25px;font-size:12px;" ${window.currentGroup.adminid == user.userid ? '' : 'hidden'}>Owner</span></h5>
                    </div>
                    <div class="col-2">
                      <img src="${pdEmbedData}" style="float: right; height: 2rem; border-radius: 50px;">
                    </div>
                  </div>
                </div>
                <div class="card-footer" ${user.userid == window.currentGroup.adminid ? 'hidden' : ''}>
                  <button onclick="removeUserFromGroup('${user.userid}')" type="button" class="btn btn-outline-danger">Remove</button>
                </div>
              </div>
            `;
        htmlList += dm;
      });
      let ababa = gebi('people-list');
      ababa.innerHTML = htmlList;
      // Set greeting.
      let btt = gebi('profile-view-item');
      btt.addEventListener('mouseover', () => {
        gebi('greeting').innerHTML = `My Profile`;
      });
      btt.addEventListener('mouseout', () => {
        gebi('greeting').innerHTML = `Hi, ${data.me.username}`;
      });
      gebi('greeting').innerHTML = `Hi, ${data.me.username}`;
      // Set vaults entries
      let vaultDom = gebi('vaults');
      vaultDom.innerHTML = '';
      data.groups.forEach(group => {
        let baseCard = document.createElement('div');
        if (currentVaultId === group.groupid) {
          window.currentGroup = group;
        }
        // Get number of incomplete tasks.
        let incomplete = 0;
        window.data.tasks.forEach(v => {
          if (v.completeddate == null && v.groupid == group.groupid) {
            incomplete++;
          }
        });
        baseCard.innerHTML = `<br>
                <div class="card">
                  <div class="card-body" data-groupid="${group.groupid}">
                    <h5 class="card-title">${group.groupname}&nbsp;<span style="float:right;border:2px solid;padding:3px;border-radius:25px;font-size:12px;" ${group.adminid == window.data.me.userid ? '' : 'hidden'}>Your vault</span>&nbsp;<span style="margin-left:5px;margin-right:5px;float:right;background-color:lightgreen;padding:5px;border-radius:25px;font-size:12px;" ${currentVaultId === group.groupid ? '' : 'hidden'}>Viewing</span></h5>
                    <small style="font-family: 'DM Mono', monospace;">
                    <i data-feather="users" style="width: 1rem;"></i> ${group.users.length} ${group.users.length == 1 ? 'person' : 'people'}
                    &nbsp;
                    <i data-feather="check-circle" style="width: 1rem;"></i> ${incomplete} tasks
                    &nbsp;
                    </small>
                  </div>
                  <div class="card-footer" ${(currentVaultId === group.groupid) && !(group.adminid === uid) && !(group.adminid === uid) ? 'hidden' : ''}>
                    <button onclick="gotoVault(${group.groupid})" type="button" class="btn btn-primary" style="display:${(currentVaultId === group.groupid) ? 'none' : 'inline'};">Go to vault</button>
                    <button onclick="editVault(${group.groupid})" type="button" class="btn btn-secondary" style="display:${(group.adminid === uid) ? 'inline' : 'none'};">Edit vault</button>
                    <button onclick="deleteVault(${group.groupid})" type="button" class="btn btn-danger" style="display:${(group.adminid === uid) ? 'inline' : 'none'};">Delete vault</button>
                  </div>
                </div>
            `;
        vaultDom.appendChild(baseCard);
        feather.replace();
      });
      // Set tags in the task editor.
      let taskEditorList = gebi('tag-editor-list');
      taskEditorList.innerHTML = '';
      window.currentTags = window.currentGroup.tags;
      console.log(window.currentTags);
      let taskTags = gebi('task-tags');
      taskTags.innerHTML = '';
      let filterTags = gebi('filter-tags');
      filterTags.innerHTML = '';
      if (window.currentTags.length === 0) {
        // No tags
        taskTags.innerHTML = `<div class="container">No tags found</div>`;
        filterTags.innerHTML = `<div class="container">No tags found</div>`;
      }
      else {
        window.currentTags.forEach(tag => {
          let dom = document.createElement('div');
          dom.innerHTML = `<button onclick="renderTagEditor(this.dataset.tagid)" data-tagid="${tag.tagid}" type="button" class="btn w-100" style="border-radius:0;background-color: ${tag.tagcolor};${isLightColor(tag.tagcolor) ? 'color: black;' : 'color: white;'}">${tag.tagname}</button>`;
          taskEditorList.appendChild(dom);

          // now create the selectors for new task
          dom = document.createElement('div');
          dom.classList = 'col';
          dom.innerHTML = `
                <input type="checkbox" class="checkbox-round" id="task-tag-number${tag.tagid}" name="task-tag-number${tag.tagid}" value="${tag.tagname}">
                <label for="task-tag-number${tag.tagid}" style="margin-top:5px;white-space:nowrap;cursor:pointer;padding:0.25rem;padding-left:0.40rem;padding-right:0.40rem;border-radius:25px;background-color:${tag.tagcolor};${isLightColor(tag.tagcolor) ? 'color: black;' : 'color: white;'}">${tag.tagname}</label><br>
              `;
          taskTags.appendChild(dom);

          // now create the selectors for filters

          dom = document.createElement('div');
          dom.classList = 'col';
          dom.innerHTML = `
                <input type="checkbox" class="checkbox-round" id="filter-tag-number${tag.tagid}" name="filter-tag-number${tag.tagid}" value="${tag.tagname}">
                <label for="filter-tag-number${tag.tagid}" style="margin-top:5px;white-space:nowrap;cursor:pointer;padding:0.25rem;padding-left:0.40rem;padding-right:0.40rem;border-radius:25px;background-color:${tag.tagcolor};${isLightColor(tag.tagcolor) ? 'color: black;' : 'color: white;'}">${tag.tagname}</label><br>
              `;
          filterTags.appendChild(dom);
        });
        taskEditorList.style.display = 'none';
        taskEditorList.style.display = 'block';
      }
      /*
      <div class="col">
                      <input type="checkbox" class="checkbox-round" id="vehicle2" name="vehicle2" value="Car">
                      <label for="vehicle2"> I have a car</label><br>
                    </div>
      */
      updateFilterPage();
      let finishRenderingTime = performance.now();
      console.log(`Client rendering time: ${(finishRenderingTime - receivedTime).toFixed(3)}ms`);
      console.log(`Request-to-response performace time: ${(receivedTime - fetchStartTime).toFixed(3)}ms`);
      console.log(`%cRequest-to-finish time: ${(finishRenderingTime - fetchStartTime).toFixed(3)}ms`, 'color: green;');

      // Are we admin of the current vault.
      if (!window.data.me.admin) {
        let zczc = gebi('adduserbutton');
        zczc.setAttribute('hidden', '');
      }

      gebi('inviteCode').innerHTML = `${window.data.me.userid}`
      gebi('inviteCode').onclick = () => {
        navigator.clipboard.writeText(window.data.me.userid);
      }
      gebi('shareCodeButton').onclick = () => {
        navigator.clipboard.writeText(window.data.me.userid);
        alert('User code copied to your clipboard. Only share with trusted people.');
      }

    }
  });
}
let currentEditingTag = null;
function renderTagEditor(id) {
  let offcanvas = gebi('tagsEditOffcanvas');
  let b = new bootstrap.Offcanvas(offcanvas);
  offcanvas.addEventListener('hide.bs.offcanvas', () => {
    // A solution for bug that the color picker no longer works on add new tag.
    location.reload();
  });
  b.show();
  let o = gebi('tag2-color');
  let del = gebi('tag2-delete');
  del.onclick = () => { deleteTag(currentEditingTag) };
  window.currentTags.forEach(tag => {
    if (tag.tagid == id) {
      gebi('tag2-name').value = tag.tagname;
      o.value = tag.tagcolor;
      o.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  Coloris({
    parent: gebi('tag2-anchor'),
    el: gebi('tag2-color'),
    alpha: false
  });
  currentEditingTag = id;
}

/**
 * Request against the API
 * @param request Object
 * @param params Object
 * @return Object
 */
async function request(request, hasBody = false, bodyContent = false) {
  openLoading();
  try {
    if (!hasBody) {
      const ret = await fetch('api/' + encodeURIComponent(JSON.stringify(request)), {
        method: 'POST'
      });
      if (!ret.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      let d = await ret.json();
      closeLoading();
      return d;
    }
    else {
      const ret = await fetch('api/' + encodeURIComponent(JSON.stringify(request)), {
        method: 'POST',
        body: JSON.stringify(bodyContent),
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!ret.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      let d = await ret.json();
      closeLoading();
      return d;
    }
  }
  catch (e) {
    closeLoading();
    //alert('Error in request, see console for details. Please refresh the page.');
    console.error(`Error while handling route ${request}`);
    console.error(e.message);
  }
}

/**
 * Attempt to login and save the auth token.
 */
function tryLogin() {
  request(['login', gebi('login-username').value, gebi('login-password').value]).then(val => {
    let status = val.status;
    if (status == 'OK') {
      // Let's save the session token.
      let sessionToken = val.token;
      storage.write('sessionToken', val.token);
      storage.write('sessionTokenExpires', val.expires);
      // Reload the page.
      location.reload();
    }
    else if (status == 'INVALID') {
      alert('The credentials are incorrect, please try again.');
    }
    else {
      alert('An unexpected error has occurred.');
      location.reload();
    }
  }).catch(e => {
    alert('An unexpected error has occurred.');
    console.error(e);
  });
}

/**
 * Returns the week number for this date.  dowOffset is the day of week the week
 * "starts" on for your locale - it can be from 0 to 6. If dowOffset is 1 (Monday),
 * the week returned is the ISO 8601 week number.
 * @param int dowOffset
 * @return int
 */
Date.prototype.getWeek = function (dowOffset) {
  /*getWeek() was developed by Nick Baicoianu at MeanFreePath: http://www.meanfreepath.com */

  dowOffset = typeof (dowOffset) == 'number' ? dowOffset : 0; //default dowOffset to zero
  var newYear = new Date(this.getFullYear(), 0, 1);
  var day = newYear.getDay() - dowOffset; //the day of week the year begins on
  day = (day >= 0 ? day : day + 7);
  var daynum = Math.floor((this.getTime() - newYear.getTime() -
    (this.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) / 86400000) + 1;
  var weeknum;
  //if the year starts before the middle of a week
  if (day < 4) {
    weeknum = Math.floor((daynum + day - 1) / 7) + 1;
    if (weeknum > 52) {
      nYear = new Date(this.getFullYear() + 1, 0, 1);
      nday = nYear.getDay() - dowOffset;
      nday = nday >= 0 ? nday : nday + 7;
      /*if the next year starts before the middle of
        the week, it is week #1 of that year*/
      weeknum = nday < 4 ? 1 : 53;
    }
  }
  else {
    weeknum = Math.floor((daynum + day - 1) / 7);
  }
  return weeknum;
};