import React, { useEffect } from 'react';
import { useTaskStore } from '../store/taskStore';

const TaskManagement = ({ projectId }) => {
  const { tasks, fetchTasks, addTask, updateTask, deleteTask } = useTaskStore();

  useEffect(() => {
    fetchTasks(projectId);
  }, [projectId, fetchTasks]);

  const handleAddTask = async () => {
    const newTask = {
      name: 'New Task',
      description: 'Task description',
      hours: 5,
      costPerHour: 100,
      total: 500,
      completed: false,
      projectId,
    };
    await addTask(newTask);
  };

  const handleUpdateTask = async (id) => {
    await updateTask(id, { completed: true });
  };

  const handleDeleteTask = async (id) => {
    await deleteTask(id);
  };

  return (
    <div>
      <h1>Task Management</h1>
      <button onClick={handleAddTask}>Add Task</button>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            {task.name}
            <button onClick={() => handleUpdateTask(task.id)}>Complete</button>
            <button onClick={() => handleDeleteTask(task.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskManagement; 