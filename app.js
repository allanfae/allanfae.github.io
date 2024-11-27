// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCYC15EdFPbkmf20esZqsmezCXVtkGkxyg",
  authDomain: "allan-fae-db.firebaseapp.com",
  databaseURL: "https://allan-fae-db-default-rtdb.firebaseio.com",
  projectId: "allan-fae-db",
  storageBucket: "allan-fae-db.appspot.com",
  messagingSenderId: "150693370336",
  appId: "1:150693370336:web:e8b81ab5787651a06ff385"
};


// Inicializando o Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database(app);
let taskIdToEdit = null;
// Eventos
window.onload = listTasks;
document.getElementById('task-form').addEventListener('submit', addTask);
document.getElementById('edit-form').addEventListener('submit', saveTaskEdits);
document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
document.getElementById('confirm-delete').addEventListener('click', deleteTask);
document.getElementById('cancel-delete').addEventListener('click', closeDeleteModal);
document.getElementById('open-modal-button').addEventListener('click', () => document.getElementById('add-task-modal').style.display = 'flex');
document.getElementById('cancel-task').addEventListener('click', () => document.getElementById('add-task-modal').style.display = 'none');


// Função para adicionar tarefa
function addTask(event) {
  event.preventDefault();
  const taskName = document.getElementById('task-name').value;
  const taskCost = parseFloat(document.getElementById('task-cost').value);
  const taskDueDate = document.getElementById('task-due-date').value;

  const normalizedTaskName = normalizeString(taskName); // Normalizando o nome da tarefa

  // Consultar todas as tarefas e verificar duplicidade
  db.ref('tasks').once('value', snapshot => {
    let isDuplicate = false;

    snapshot.forEach(childSnapshot => {
      const task = childSnapshot.val();
      const normalizedExistingTaskName = normalizeString(task.nome);  // Normaliza o nome das tarefas existentes
      // Se encontrar um nome normalizado igual ao da nova tarefa, marca como duplicado
      if (normalizedExistingTaskName === normalizedTaskName) {
        isDuplicate = true;
      }
    });

    if (isDuplicate) {
      alert('Já existe uma tarefa com esse nome!');
    } else {
      // Se não for duplicado, adicionar a tarefa normalmente
      db.ref('tasks').orderByChild('ordem').limitToLast(1).once('value', snapshot => {
        const newOrder = snapshot.exists() ? Object.values(snapshot.val())[0].ordem + 1 : 0;
        const newTaskRef = db.ref('tasks').push();
        newTaskRef.set({ nome: taskName, custo: taskCost, dataLimite: taskDueDate, ordem: newOrder });

        document.getElementById('task-form').reset();
        listTasks();
      });
    }
  });
}

// Função para formatar a data para DD/MM/YYYY
function formatDate(dateStr) {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Mês é zero-indexed
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Função para listar tarefas
function listTasks() {
  const taskList = document.getElementById('task-list');
  taskList.innerHTML = '';  // Limpa a lista de tarefas
  const taskTemplate = document.getElementById('task-template');

  db.ref('tasks').orderByChild('ordem').once('value', snapshot => {
    const tasks = [];
    snapshot.forEach(childSnapshot => {
      tasks.push({ id: childSnapshot.key, ...childSnapshot.val() });
    });

    tasks.forEach((task, index) => {
      // Clonando o template
      const taskItem = taskTemplate.content.cloneNode(true);
      const taskElement = taskItem.querySelector('.task-item');
      
      // Atribuindo o ID da tarefa (chave primária) ao data-task-id
      taskElement.setAttribute('data-task-id', task.id);

      // Exibir o ID na interface
      taskElement.querySelector('.task-id').textContent = task.id;  // Preenche o campo do ID

      taskElement.querySelector('.task-name').textContent = task.nome;
      taskElement.querySelector('.task-cost').textContent = task.custo.toFixed(2);

      // Formatar e exibir a data
      taskElement.querySelector('.task-date').textContent = formatDate(task.dataLimite);

      // Destacar tarefas com custo > 1000
      if (task.custo >= 1000) taskElement.classList.add('highlight');

      // Adicionando os eventos para editar, excluir e reordenar
      addTaskEventListeners(taskElement, task.id);

      // Adicionando a tarefa na lista
      taskList.appendChild(taskItem);
    });

    // Atualizar visibilidade das setas
    updateArrowsVisibility();
  });
}




// Adiciona eventos de edição, exclusão e reordenamento
function addTaskEventListeners(taskElement, taskId) {
  taskElement.querySelector('.edit').addEventListener('click', () => showEditModal(taskId));
  taskElement.querySelector('.delete').addEventListener('click', () => showDeleteModal(taskId));
  taskElement.querySelector('.reorder.btn-success').addEventListener('click', () => reorderTask(taskId, 'up'));
  taskElement.querySelector('.reorder.btn-warning').addEventListener('click', () => reorderTask(taskId, 'down'));

  // Eventos de drag-and-drop
  taskElement.addEventListener('dragstart', dragStart);
  taskElement.addEventListener('dragover', dragOver);
  taskElement.addEventListener('drop', drop);
}

// Funções de Drag-and-Drop
let draggedItem = null;

function dragStart(event) {
  draggedItem = event.target;
  event.dataTransfer.setData('text/html', draggedItem.innerHTML);
  draggedItem.classList.add('dragging'); // Visualização de item sendo arrastado
}

function dragOver(event) {
  event.preventDefault();
}

function drop(event) {
  event.preventDefault();
  const targetItem = event.target.closest('.task-item');

  if (targetItem && targetItem !== draggedItem) {
    swapTasks(draggedItem, targetItem);
  }
}

// Troca a ordem entre duas tarefas
function swapTasks(draggedItem, targetItem) {
  const draggedId = draggedItem.getAttribute('data-task-id');
  const targetId = targetItem.getAttribute('data-task-id');

  const draggedTaskRef = db.ref('tasks/' + draggedId);
  const targetTaskRef = db.ref('tasks/' + targetId);

  draggedTaskRef.once('value', draggedSnapshot => {
    const draggedTask = draggedSnapshot.val();
    targetTaskRef.once('value', targetSnapshot => {
      const targetTask = targetSnapshot.val();
      const tempOrder = draggedTask.ordem;
      draggedTaskRef.update({ ordem: targetTask.ordem });
      targetTaskRef.update({ ordem: tempOrder }).then(() => listTasks());
    });
  });
}

// Função para mostrar o modal de edição
function showEditModal(taskId) {
  const modal = document.getElementById('edit-modal');
  taskIdToEdit = taskId;  // Armazene o ID da tarefa a ser editada

  db.ref('tasks/' + taskId).once('value', snapshot => {
    const task = snapshot.val();
    document.getElementById('edit-task-name').value = task.nome;
    document.getElementById('edit-task-cost').value = task.custo;
    document.getElementById('edit-task-due-date').value = task.dataLimite;
    modal.style.display = 'flex';
  });
}


function saveTaskEdits(event) {
  event.preventDefault();

  const updatedName = document.getElementById('edit-task-name').value;
  const updatedCost = parseFloat(document.getElementById('edit-task-cost').value);
  const updatedDueDate = document.getElementById('edit-task-due-date').value;
  
  console.log('Editando tarefa:', taskIdToEdit);

  if (!taskIdToEdit) {
    console.error('taskIdToEdit está indefinido ou nulo');
    alert('Erro: Não foi possível identificar a tarefa a ser editada.');
    return;
  }

  const updatedTask = {
    nome: updatedName,
    custo: updatedCost,
    dataLimite: updatedDueDate
  };

  console.log('Tarefa atualizada:', updatedTask);

  db.ref('tasks/' + taskIdToEdit).update(updatedTask)
    .then(() => {
      console.log('Tarefa atualizada no Firebase');
      closeEditModal();
      listTasks();
    })
    .catch(error => {
      console.error('Erro ao editar a tarefa:', error);
      alert('Ocorreu um erro ao salvar a edição da tarefa.');
    });
}



// Função para normalizar o nome, removendo acentos e transformando em minúsculas
function normalizeString(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}


// Função para fechar o modal de edição
function closeEditModal() {
  document.getElementById('edit-modal').style.display = 'none';
}

// Função para mostrar o modal de exclusão
function showDeleteModal(taskId) {
  taskIdToDelete = taskId;
  document.getElementById('delete-modal').style.display = 'flex';
}

// Função para excluir a tarefa
function deleteTask() {
  db.ref('tasks/' + taskIdToDelete).remove()
    .then(() => {
      closeDeleteModal();
      listTasks();
    })
    .catch(error => console.error('Erro ao excluir a tarefa:', error));
}

// Função para fechar o modal de exclusão
function closeDeleteModal() {
  document.getElementById('delete-modal').style.display = 'none';
}

// Função para reordenar a tarefa
function reorderTask(taskId, direction) {
  const taskRef = db.ref('tasks/' + taskId);
  taskRef.once('value', snapshot => {
    const task = snapshot.val();
    const currentOrder = task.ordem;
    const newOrder = direction === 'up' ? currentOrder - 1 : currentOrder + 1;

    if (newOrder < 0) return;

    db.ref('tasks').orderByChild('ordem').equalTo(newOrder).once('value', snapshot => {
      const neighborTask = snapshot.val();
      if (neighborTask) {
        const neighborId = Object.keys(neighborTask)[0];

        // Atualizar as ordens no Firebase
        const updates = {};
        updates[`tasks/${taskId}/ordem`] = newOrder;
        updates[`tasks/${neighborId}/ordem`] = currentOrder;

        db.ref().update(updates)
          .then(() => listTasks());
      }
    });
  });
}

// Função para atualizar visibilidade das setas
function updateArrowsVisibility() {
  const taskItems = document.querySelectorAll('.task-item');
  taskItems.forEach((taskItem, index) => {
    const reorderUpBtn = taskItem.querySelector('.reorder.btn-success');
    const reorderDownBtn = taskItem.querySelector('.reorder.btn-warning');
    reorderUpBtn.style.display = index === 0 ? 'none' : 'inline-block';
    reorderDownBtn.style.display = index === taskItems.length - 1 ? 'none' : 'inline-block';
  });
}
