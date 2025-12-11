require('dotenv/config');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:4200';

const DB_HOST = process.env.DB_HOST || process.env.MYSQL_HOST || 'localhost';
const DB_USER = process.env.DB_USER || process.env.MYSQL_USER || 'root';
const DB_PASSWORD = process.env.DB_PASS || process.env.MYSQL_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'sisproyect';
const DB_PORT = Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306);
// Use network path since server runs locally but files are on network share
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../public/uploads/docs');


fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
});

async function createPool() {
  return mysql.createPool({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    port: DB_PORT,
    waitForConnections: true,
    connectionLimit: 50,
    queueLimit: 0,
    timezone: 'Z',
    dateStrings: true,
    charset: 'utf8mb4',
  });
}

async function main() {
  const pool = await createPool();
  await initTables(pool);
  const app = express();

  // CORS configuration - allow multiple origins
  const allowedOrigins = [
    'http://localhost:4200',
    
    'http://127.0.0.1:4200'
  ];

  app.use(cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || origin === ORIGIN) {
        callback(null, true);
      } else {
        callback(null, true); // For development, allow all origins
      }
    },
    credentials: true
  }));

  app.use(express.json());

  // Serve static files with proper CORS headers
  app.use('/uploads', (_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
  }, express.static(path.join(__dirname, '../public/uploads')));

  // Departments
  app.get('/api/departments', async (_req, res) => {
    const [rows] = await pool.query('SELECT id, name, color FROM departments');
    res.json(rows);
  });

  app.post('/api/departments', async (req, res) => {
    try {
      const { name, color } = req.body ?? {};
      if (!name || !color) {
        return res.status(400).json({ message: 'name y color son requeridos' });
      }
      const id = crypto.randomUUID();
      await pool.query('INSERT INTO departments (id, name, color) VALUES (?, ?, ?)', [id, name, color]);
      res.status(201).json({ id, name, color });
    } catch (err) {
      console.error('Error creating department', err);
      res.status(500).json({ message: 'Error creando departamento' });
    }
  });

  app.put('/api/departments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, color } = req.body ?? {};
      if (!name || !color) {
        return res.status(400).json({ message: 'name y color son requeridos' });
      }
      await pool.query('UPDATE departments SET name = ?, color = ? WHERE id = ?', [name, color, id]);
      res.json({ id, name, color });
    } catch (err) {
      console.error('Error updating department', err);
      res.status(500).json({ message: 'Error actualizando departamento' });
    }
  });

  app.delete('/api/departments/:id', async (req, res) => {
    try {
      const { id } = req.params;
      // Verificar si hay usuarios en este departamento
      const [users] = await pool.query('SELECT COUNT(*) as count FROM users WHERE department_id = ?', [id]);
      if (users[0].count > 0) {
        return res.status(400).json({ message: 'No se puede eliminar: hay usuarios asignados a este departamento' });
      }
      // Verificar si hay tareas en este departamento
      const [tasks] = await pool.query('SELECT COUNT(*) as count FROM tasks WHERE department_id = ?', [id]);
      if (tasks[0].count > 0) {
        return res.status(400).json({ message: 'No se puede eliminar: hay tareas asignadas a este departamento' });
      }
      await pool.query('DELETE FROM departments WHERE id = ?', [id]);
      res.json({ message: 'Departamento eliminado' });
    } catch (err) {
      console.error('Error deleting department', err);
      res.status(500).json({ message: 'Error eliminando departamento' });
    }
  });

  // Workspaces
  app.get('/api/workspaces', async (_req, res) => {
    try {
      const [rows] = await pool.query('SELECT id, name, description, color, icon, created_at as createdAt FROM workspaces ORDER BY name');
      res.json(rows);
    } catch (err) {
      console.error('Error fetching workspaces', err);
      res.status(500).json({ message: 'Error obteniendo espacios de trabajo' });
    }
  });

  app.get('/api/workspaces/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.query('SELECT id, name, description, color, icon, created_at as createdAt FROM workspaces WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Espacio de trabajo no encontrado' });
      }
      res.json(rows[0]);
    } catch (err) {
      console.error('Error fetching workspace', err);
      res.status(500).json({ message: 'Error obteniendo espacio de trabajo' });
    }
  });

  app.post('/api/workspaces', async (req, res) => {
    try {
      const { name, description, color, icon } = req.body ?? {};
      if (!name) {
        return res.status(400).json({ message: 'El nombre es requerido' });
      }
      const id = crypto.randomUUID();
      const finalColor = color || '#22d3ee';
      await pool.query(
        'INSERT INTO workspaces (id, name, description, color, icon) VALUES (?, ?, ?, ?, ?)',
        [id, name, description || null, finalColor, icon || null]
      );
      res.status(201).json({ id, name, description, color: finalColor, icon });
    } catch (err) {
      console.error('Error creating workspace', err);
      res.status(500).json({ message: 'Error creando espacio de trabajo' });
    }
  });

  app.put('/api/workspaces/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, color, icon } = req.body ?? {};
      const fields = [];
      const params = [];
      
      if (name) { fields.push('name = ?'); params.push(name); }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }
      if (color) { fields.push('color = ?'); params.push(color); }
      if (icon !== undefined) { fields.push('icon = ?'); params.push(icon); }
      
      if (!fields.length) {
        return res.status(400).json({ message: 'No hay campos para actualizar' });
      }
      
      params.push(id);
      await pool.query(`UPDATE workspaces SET ${fields.join(', ')} WHERE id = ?`, params);
      res.json({ id, name, description, color, icon });
    } catch (err) {
      console.error('Error updating workspace', err);
      res.status(500).json({ message: 'Error actualizando espacio de trabajo' });
    }
  });

  app.delete('/api/workspaces/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if workspace has projects
      const [projects] = await pool.query('SELECT COUNT(*) as count FROM projects WHERE workspace_id = ?', [id]);
      if (projects[0].count > 0) {
        return res.status(400).json({ message: 'No se puede eliminar un espacio de trabajo que contiene proyectos' });
      }
      
      await pool.query('DELETE FROM workspaces WHERE id = ?', [id]);
      res.json({ message: 'Espacio de trabajo eliminado' });
    } catch (err) {
      console.error('Error deleting workspace', err);
      res.status(500).json({ message: 'Error eliminando espacio de trabajo' });
    }
  });

  app.get('/api/workspaces/:id/projects', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.query(
        'SELECT id, name, description, status, start, end, created_by as createdBy, logo, workspace_id as workspaceId, created_at, updated_at FROM projects WHERE workspace_id = ?',
        [id]
      );
      res.json(rows);
    } catch (err) {
      console.error('Error fetching workspace projects', err);
      res.status(500).json({ message: 'Error obteniendo proyectos del espacio de trabajo' });
    }
  });

  // Projects
  app.get('/api/projects', async (req, res) => {
    try {
      const { departmentId } = req.query;

      let query = 'SELECT id, name, description, status, start, end, created_by as createdBy, logo, workspace_id as workspaceId, created_at, updated_at FROM projects';
      let params = [];

      // Si se proporciona departmentId, filtrar proyectos que tienen tareas de ese departamento
      if (departmentId) {
        query = `
          SELECT DISTINCT p.id, p.name, p.description, p.status, p.start, p.end,
                 p.created_by as createdBy, p.logo, p.workspace_id as workspaceId,
                 p.created_at, p.updated_at
          FROM projects p
          INNER JOIN tasks t ON t.project_id = p.id
          WHERE t.department_id = ?
        `;
        params = [departmentId];
      }

      const [rows] = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      console.error('Error fetching projects', err);
      res.status(500).json({ message: 'Error obteniendo proyectos' });
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
      if (!rows.length) {
        return res.status(404).json({ message: 'Proyecto no encontrado' });
      }
      res.json(rows[0]);
    } catch (err) {
      console.error('Error fetching project', err);
      res.status(500).json({ message: 'Error obteniendo proyecto' });
    }
  });

  app.get('/api/projects/:id/stats', async (req, res) => {
    try {
      const { id } = req.params;
      const [stats] = await pool.query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status IN ('completed', 'done') THEN 1 ELSE 0 END) as completed
        FROM tasks
        WHERE project_id = ?
      `, [id]);
      res.json(stats[0] || { total: 0, completed: 0 });
    } catch (err) {
      console.error('Error fetching project stats', err);
      res.status(500).json({ message: 'Error obteniendo estadísticas' });
    }
  });

  // Configuración de Multer para documentos (usa la misma config global)
  // Ya no necesitamos esta configuración duplicada, usamos la del inicio del archivo
  const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
  });

  // Configuración de Multer para logos
  const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, '../public/uploads/logos');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + '-' + file.originalname);
    },
  });
  const uploadLogo = multer({ storage: logoStorage });

  app.post('/api/projects', uploadLogo.single('logo'), async (req, res) => {
    try {
      const { name, description, status, start, end, createdBy, workspaceId } = req.body ?? {};
      if (!name) {
        return res.status(400).json({ message: 'name es requerido' });
      }
      
      const logoPath = req.file ? `/uploads/logos/${req.file.filename}` : null;
      const id = crypto.randomUUID();
      
      await pool.query(
        'INSERT INTO projects (id, name, description, status, start, end, created_by, logo, workspace_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, name, description || '', status || 'development', start || null, end || null, createdBy || null, logoPath, workspaceId || null]
      );
      
      res.status(201).json({ 
        id, 
        name, 
        description, 
        status: status || 'development', 
        start, 
        end, 
        createdBy, 
        logo: logoPath,
        workspaceId
      });
    } catch (err) {
      console.error('Error creating project', err);
      res.status(500).json({ message: 'Error creando proyecto' });
    }
  });

  app.put('/api/projects/:id', uploadLogo.single('logo'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, status, start, end, workspaceId } = req.body ?? {};
      const fields = [];
      const params = [];

      if (name) { fields.push('name = ?'); params.push(name); }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }
      if (status) { fields.push('status = ?'); params.push(status); }
      if (start !== undefined) { fields.push('start = ?'); params.push(start); }
      if (end !== undefined) { fields.push('end = ?'); params.push(end); }
      if (workspaceId !== undefined) { fields.push('workspace_id = ?'); params.push(workspaceId); }
      
      if (req.file) {
        const logoPath = `/uploads/logos/${req.file.filename}`;
        fields.push('logo = ?');
        params.push(logoPath);
      }

      if (!fields.length) {
        return res.status(400).json({ message: 'No hay campos para actualizar' });
      }

      params.push(id);
      await pool.query(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, params);
      
      // Fetch updated project to return complete data
      const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
      res.json(rows[0]);
    } catch (err) {
      console.error('Error updating project', err);
      res.status(500).json({ message: 'Error actualizando proyecto' });
    }
  });

  // Tasks
  app.get('/api/tasks', async (_req, res) => {
    const [rows] = await pool.query(
      'SELECT id, project_id as projectId, parent_task_id as parentTaskId, department_id as departmentId, title, description, assigned_to as assignedTo, status, priority, due, effort, created_at as createdAt, completed_at as completedAt FROM tasks',
    );
    res.json(rows);
  });

  app.get('/api/projects/:id/tasks', async (req, res) => {
    try {
      const { id } = req.params;
      const { departmentId } = req.query;

      // Obtener todas las tareas del proyecto
      const [allTasks] = await pool.query(
        `SELECT t.id, t.project_id as projectId, t.parent_task_id as parentTaskId, t.department_id as departmentId,
                t.title, t.description, t.assigned_to as assignedTo, t.status, t.priority, t.due, t.effort,
                t.created_at as createdAt, t.completed_at as completedAt,
                t.released_version_id as releasedVersionId, pv.version_name as releasedVersionName
         FROM tasks t
         LEFT JOIN project_versions pv ON t.released_version_id = pv.id
         WHERE t.project_id = ?`,
        [id]
      );

      // Si no se proporciona departmentId, devolver todas las tareas (admin)
      if (!departmentId) {
        return res.json(allTasks);
      }

      // Filtrar tareas: incluir tareas del departamento, sus subtareas, y mostrar padres para contexto
      const filteredTasks = [];
      const taskMap = new Map();
      allTasks.forEach(task => taskMap.set(task.id, task));

      // Función recursiva para obtener todas las subtareas
      const getSubtasks = (taskId) => {
        return allTasks.filter(t => t.parentTaskId === taskId);
      };

      // Función recursiva para obtener la cadena de padres hasta la raíz
      const getParentChain = (task) => {
        const chain = [];
        let current = task;
        while (current.parentTaskId) {
          const parent = taskMap.get(current.parentTaskId);
          if (parent) {
            chain.unshift(parent);
            current = parent;
          } else {
            break;
          }
        }
        return chain;
      };

      // Función para agregar tarea, todas sus subtareas, y marcar contexto
      const addTaskWithSubtasks = (task) => {
        if (!filteredTasks.find(t => t.id === task.id)) {
          // Evaluar si esta tarea específica pertenece al departamento del usuario
          const isOwnTask = task.departmentId === departmentId;

          // Agregar marca de si es tarea propia del departamento
          filteredTasks.push({
            ...task,
            isOwnDepartment: isOwnTask
          });

          // Recursivamente agregar todas las subtareas
          const subtasks = getSubtasks(task.id);
          subtasks.forEach(subtask => addTaskWithSubtasks(subtask));
        }
      };

      // Agregar tareas del departamento y sus subtareas
      allTasks.forEach(task => {
        if (task.departmentId === departmentId) {
          // Primero agregar la cadena de padres para contexto (marcadas como no propias)
          const parentChain = getParentChain(task);
          parentChain.forEach(parent => {
            if (!filteredTasks.find(t => t.id === parent.id)) {
              filteredTasks.push({
                ...parent,
                isOwnDepartment: false // Marcar como contexto solamente
              });
            }
          });
          // Luego agregar la tarea propia y sus subtareas
          addTaskWithSubtasks(task);
        }
      });

      res.json(filteredTasks);
    } catch (err) {
      console.error('Error fetching tasks', err);
      res.status(500).json({ message: 'Error obteniendo tareas' });
    }
  });

  app.get('/api/tasks/:id/subtasks', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.query(
        'SELECT id, project_id as projectId, parent_task_id as parentTaskId, department_id as departmentId, title, description, assigned_to as assignedTo, status, priority, due, effort, created_at as createdAt, completed_at as completedAt FROM tasks WHERE parent_task_id = ?',
        [id]
      );
      res.json(rows);
    } catch (err) {
      console.error('Error fetching subtasks', err);
      res.status(500).json({ message: 'Error obteniendo subtareas' });
    }
  });

  app.post('/api/tasks', async (req, res) => {
    try {
      const { projectId, parentTaskId, title, description, assignedTo, status, priority, due, effort, departmentId } = req.body ?? {};
      if (!projectId || !title) {
        return res.status(400).json({ message: 'projectId y title son requeridos' });
      }
      const id = crypto.randomUUID();
      await pool.query(
        'INSERT INTO tasks (id, project_id, parent_task_id, title, description, assigned_to, status, priority, due, effort, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, projectId, parentTaskId || null, title, description || '', assignedTo || null, status || 'pending', priority || 'media', due || null, effort || 0, departmentId || null]
      );
      // Obtener la tarea recién creada con created_at
      const [rows] = await pool.query(
        'SELECT id, project_id as projectId, parent_task_id as parentTaskId, department_id as departmentId, title, description, assigned_to as assignedTo, status, priority, due, effort, created_at as createdAt, completed_at as completedAt FROM tasks WHERE id = ?',
        [id]
      );
      res.status(201).json(rows[0]);
    } catch (err) {
      console.error('Error creating task', err);
      res.status(500).json({ message: 'Error creando tarea' });
    }
  });

  app.put('/api/tasks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, assignedTo, status, priority, due, effort, departmentId } = req.body ?? {};
      const fields = [];
      const params = [];
      if (title) { fields.push('title = ?'); params.push(title); }
      if (description !== undefined) { fields.push('description = ?'); params.push(description); }
      if (assignedTo !== undefined) { fields.push('assigned_to = ?'); params.push(assignedTo); }
      if (status) {
        fields.push('status = ?');
        params.push(status);
        // Si el estado cambia a 'completed', guardar la fecha actual
        if (status === 'completed') {
          fields.push('completed_at = NOW()');
        }
        // Si el estado cambia de 'completed' a otro, limpiar la fecha
        if (status !== 'completed') {
          fields.push('completed_at = NULL');
        }
      }
      if (priority) { fields.push('priority = ?'); params.push(priority); }
      if (due !== undefined) { fields.push('due = ?'); params.push(due); }
      if (effort !== undefined) { fields.push('effort = ?'); params.push(effort); }
      if (departmentId !== undefined) { fields.push('department_id = ?'); params.push(departmentId); }
      if (!fields.length) {
        return res.status(400).json({ message: 'No hay campos para actualizar' });
      }
      params.push(id);
      await pool.query(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, params);
      res.json({ id, title, description, assignedTo, status, priority, due, effort, departmentId });
    } catch (err) {
      console.error('Error updating task', err);
      res.status(500).json({ message: 'Error actualizando tarea' });
    }
  });

  app.delete('/api/tasks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM tasks WHERE id = ?', [id]);
      res.json({ id });
    } catch (err) {
      console.error('Error deleting task', err);
      res.status(500).json({ message: 'Error eliminando tarea' });
    }
  });

  // Task Comments
  app.get('/api/tasks/:taskId/comments', async (req, res) => {
    try {
      const { taskId } = req.params;
      const [rows] = await pool.query(`
        SELECT tc.*, u.username as user_name, pv.version_name
        FROM task_comments tc
        LEFT JOIN users u ON tc.user_id = u.id
        LEFT JOIN project_versions pv ON tc.version_id = pv.id
        WHERE tc.task_id = ?
        ORDER BY tc.created_at ASC
      `, [taskId]);
      res.json(rows.map(row => ({
        id: row.id,
        taskId: row.task_id,
        userId: row.user_id,
        userName: row.user_name,
        comment: row.comment,
        versionId: row.version_id,
        versionName: row.version_name,
        createdAt: row.created_at
      })));
    } catch (err) {
      console.error('Error loading task comments', err);
      res.status(500).json({ message: 'Error cargando comentarios' });
    }
  });

  app.post('/api/tasks/:taskId/comments', async (req, res) => {
    try {
      const { taskId } = req.params;
      const { userId, comment } = req.body ?? {};
      if (!userId || !comment) {
        return res.status(400).json({ message: 'userId y comment son requeridos' });
      }
      const id = crypto.randomUUID();
      await pool.query(
        'INSERT INTO task_comments (id, task_id, user_id, comment) VALUES (?, ?, ?, ?)',
        [id, taskId, userId, comment]
      );
      const [rows] = await pool.query('SELECT username FROM users WHERE id = ?', [userId]);
      res.status(201).json({
        id,
        taskId,
        userId,
        userName: rows[0]?.username,
        comment,
        createdAt: new Date()
      });
    } catch (err) {
      console.error('Error creating comment', err);
      res.status(500).json({ message: 'Error creando comentario' });
    }
  });

  // Task Documents
  app.get('/api/tasks/:taskId/documents', async (req, res) => {
    try {
      const { taskId } = req.params;
      const [rows] = await pool.query(`
        SELECT td.*, u.username as created_by_name, pv.version_name
        FROM task_documents td
        LEFT JOIN users u ON td.created_by = u.id
        LEFT JOIN project_versions pv ON td.version_id = pv.id
        WHERE td.task_id = ?
        ORDER BY td.created_at DESC
      `, [taskId]);
      res.json(rows.map(row => ({
        id: row.id,
        taskId: row.task_id,
        projectId: row.project_id,
        title: row.title,
        description: row.description,
        fileName: row.file_name,
        filePath: row.file_path,
        mimeType: row.mime_type,
        size: row.size,
        createdBy: row.created_by,
        createdByName: row.created_by_name,
        versionId: row.version_id,
        versionName: row.version_name,
        createdAt: row.created_at
      })));
    } catch (err) {
      console.error('Error loading task documents', err);
      res.status(500).json({ message: 'Error cargando documentos' });
    }
  });

  app.post('/api/tasks/:taskId/documents', upload.single('file'), async (req, res) => {
    try {
      const { taskId } = req.params;
      const { projectId, title, description, createdBy } = req.body ?? {};
      console.log('Upload request received:', { taskId, projectId, title, file: req.file?.filename });
      if (!req.file || !projectId || !title) {
        console.log('Validation failed:', { hasFile: !!req.file, hasProjectId: !!projectId, hasTitle: !!title });
        return res.status(400).json({ message: 'file, projectId y title son requeridos' });
      }
      const id = crypto.randomUUID();
      const filePath = '/uploads/docs/' + req.file.filename;
      console.log('Saving file:', { id, filePath, filename: req.file.filename });
      await pool.query(
        'INSERT INTO task_documents (id, task_id, project_id, title, description, file_name, file_path, mime_type, size, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, taskId, projectId, title, description, req.file.originalname, filePath, req.file.mimetype, req.file.size, createdBy]
      );
      res.status(201).json({
        id,
        taskId,
        projectId,
        title,
        description,
        fileName: req.file.originalname,
        filePath,
        mimeType: req.file.mimetype,
        size: req.file.size,
        createdBy
      });
    } catch (err) {
      console.error('Error uploading task document', err);
      res.status(500).json({ message: 'Error subiendo documento' });
    }
  });

  // Progress by department
  app.get('/api/projects/:id/progress', async (req, res) => {
    try {
      const { id } = req.params;
      const [tasks] = await pool.query(
        'SELECT status, department_id as departmentId FROM tasks WHERE project_id = ?',
        [id]
      );
      const [departments] = await pool.query('SELECT id, name, color FROM departments');

      const progress = departments.map(dept => {
        const deptTasks = tasks.filter(t => t.departmentId === dept.id);
        const total = deptTasks.length;
        const completed = deptTasks.filter(t => t.status === 'completed').length;
        const inProgress = deptTasks.filter(t => t.status === 'in-progress').length;
        const pending = deptTasks.filter(t => t.status === 'pending').length;
        const cancelled = deptTasks.filter(t => t.status === 'cancelled').length;

        // Calcular progreso excluyendo tareas canceladas
        const activeTasks = total - cancelled;
        const progressPercent = activeTasks > 0 ? Math.round((completed / activeTasks) * 100) : 0;

        return {
          department: dept,
          total,
          completed,
          inProgress,
          pending,
          cancelled,
          progress: progressPercent
        };
      });

      res.json(progress);
    } catch (err) {
      console.error('Error fetching progress', err);
      res.status(500).json({ message: 'Error obteniendo progreso' });
    }
  });

  // Project documents
  app.get('/api/projects/:id/documents', async (req, res) => {
    try {
      const { id } = req.params;

      // Get project documents
      const [projectDocs] = await pool.query(
        `SELECT
          d.id,
          d.project_id AS projectId,
          d.version_id AS versionId,
          d.title,
          d.description,
          d.file_name AS fileName,
          d.file_path AS filePath,
          d.mime_type AS mimeType,
          d.size,
          d.created_by AS createdBy,
          d.created_at AS createdAt,
          v.version_name AS versionName,
          u.username AS createdByName,
          NULL AS taskId,
          NULL AS taskTitle
        FROM project_documents d
        LEFT JOIN project_versions v ON v.id = d.version_id
        LEFT JOIN users u ON u.id = d.created_by
        WHERE d.project_id = ?`,
        [id]
      );

      // Get task documents for this project
      const [taskDocs] = await pool.query(
        `SELECT
          td.id,
          td.project_id AS projectId,
          NULL AS versionId,
          td.title,
          td.description,
          td.file_name AS fileName,
          td.file_path AS filePath,
          td.mime_type AS mimeType,
          td.size,
          td.created_by AS createdBy,
          td.created_at AS createdAt,
          NULL AS versionName,
          u.username AS createdByName,
          td.task_id AS taskId,
          t.title AS taskTitle
        FROM task_documents td
        LEFT JOIN users u ON u.id = td.created_by
        LEFT JOIN tasks t ON t.id = td.task_id
        WHERE td.project_id = ?`,
        [id]
      );

      // Combine and sort by date
      const allDocs = [...projectDocs, ...taskDocs].sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      );

      res.json(allDocs);
    } catch (err) {
      console.error('Error fetching documents', err);
      res.status(500).json({ message: 'Error obteniendo documentos' });
    }
  });

  app.post('/api/projects/:id/documents', upload.single('file'), async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, versionId, createdBy } = req.body ?? {};
      if (!title) {
        return res.status(400).json({ message: 'title es requerido' });
      }
      if (!req.file) {
        return res.status(400).json({ message: 'Archivo requerido' });
      }
      const docId = crypto.randomUUID();
      const filePath = `/uploads/docs/${req.file.filename}`;

      await pool.query(
        `INSERT INTO project_documents
          (id, project_id, version_id, title, description, file_name, file_path, mime_type, size, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          docId,
          id,
          versionId || null,
          title,
          description || '',
          req.file.originalname,
          filePath,
          req.file.mimetype,
          req.file.size,
          createdBy || null,
        ]
      );

      res.status(201).json({
        id: docId,
        projectId: id,
        versionId: versionId || null,
        title,
        description: description || '',
        fileName: req.file.originalname,
        filePath,
        mimeType: req.file.mimetype,
        size: req.file.size,
        createdBy: createdBy || null,
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error creating document', err);
      res.status(500).json({ message: 'Error creando documento' });
    }
  });

  // Project versions
  app.get('/api/projects/:id/versions', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.query(
        'SELECT id, project_id as projectId, version_name as versionName, snapshot_data as snapshotData, created_by as createdBy, created_at as createdAt FROM project_versions WHERE project_id = ? ORDER BY created_at DESC',
        [id]
      );
      const versions = rows.map(row => ({
        ...row,
        snapshotData: typeof row.snapshotData === 'string' ? JSON.parse(row.snapshotData) : row.snapshotData
      }));
      res.json(versions);
    } catch (err) {
      console.error('Error fetching versions', err);
      res.status(500).json({ message: 'Error obteniendo versiones' });
    }
  });
  app.get('/api/projects/:id/version-preview', async (req, res) => {
    try {
      const { id } = req.params;

      // 1. Get unversioned completed tasks
      const [tasks] = await pool.query(
        `SELECT id, title, status FROM tasks 
         WHERE project_id = ? AND status IN ('completed', 'done') AND released_version_id IS NULL`,
        [id]
      );

      // 2. Get unversioned project documents
      const [projectDocs] = await pool.query(
        `SELECT id, title, file_name FROM project_documents 
         WHERE project_id = ? AND version_id IS NULL`,
        [id]
      );

      // 3. Get unversioned task documents
      const [taskDocs] = await pool.query(
        `SELECT td.id, td.title, td.file_name, t.title as taskTitle
         FROM task_documents td
         JOIN tasks t ON t.id = td.task_id
         WHERE td.project_id = ? AND td.version_id IS NULL`,
        [id]
      );

      // 4. Get unversioned comments
      const [comments] = await pool.query(
        `SELECT tc.id, tc.comment, u.username, t.title as taskTitle
         FROM task_comments tc
         JOIN tasks t ON t.id = tc.task_id
         JOIN users u ON u.id = tc.user_id
         WHERE t.project_id = ? AND tc.version_id IS NULL`,
        [id]
      );

      res.json({
        tasks,
        documents: [...projectDocs, ...taskDocs],
        comments,
        summary: {
          tasksCount: tasks.length,
          documentsCount: projectDocs.length + taskDocs.length,
          commentsCount: comments.length
        }
      });
    } catch (err) {
      console.error('Error fetching version preview', err);
      res.status(500).json({ message: 'Error obteniendo previsualización de versión' });
    }
  });

  app.post('/api/projects/:id/versions', async (req, res) => {
    try {
      const { id } = req.params;
      const { versionName, createdBy } = req.body ?? {};
      if (!versionName) {
        return res.status(400).json({ message: 'versionName es requerido' });
      }

      // Get current project state
      const [project] = await pool.query('SELECT * FROM projects WHERE id = ?', [id]);
      if (!project.length) {
        return res.status(404).json({ message: 'Proyecto no encontrado' });
      }

      // Find tasks that are completed AND not yet released in a version
      const [tasksToRelease] = await pool.query(
        `SELECT id, project_id as projectId, parent_task_id as parentTaskId, department_id as departmentId,
                title, description, assigned_to as assignedTo, status, priority, due, effort
         FROM tasks
         WHERE project_id = ?
           AND status IN ('completed', 'done')
           AND released_version_id IS NULL`,
        [id]
      );

      // Find unversioned documents (project and task level)
      const [projectDocs] = await pool.query(
        'SELECT * FROM project_documents WHERE project_id = ? AND version_id IS NULL',
        [id]
      );
      const [taskDocs] = await pool.query(
        'SELECT * FROM task_documents WHERE project_id = ? AND version_id IS NULL',
        [id]
      );

      // Find unversioned comments
      const [commentsToRelease] = await pool.query(
        `SELECT tc.* FROM task_comments tc
         JOIN tasks t ON t.id = tc.task_id
         WHERE t.project_id = ? AND tc.version_id IS NULL`,
        [id]
      );

      if (tasksToRelease.length === 0 && projectDocs.length === 0 && taskDocs.length === 0 && commentsToRelease.length === 0) {
        return res.status(400).json({
          message: 'No hay cambios nuevos (tareas, documentos o comentarios) para incluir en esta versión.'
        });
      }

      const snapshotData = {
        project: project[0],
        tasks: tasksToRelease,
        documents: [...projectDocs, ...taskDocs],
        comments: commentsToRelease,
        timestamp: new Date().toISOString(),
        note: 'Incremental version'
      };

      const versionId = crypto.randomUUID();
      const connection = await pool.getConnection();

      try {
        await connection.beginTransaction();

        // Create version record
        await connection.query(
          'INSERT INTO project_versions (id, project_id, version_name, snapshot_data, created_by) VALUES (?, ?, ?, ?, ?)',
          [versionId, id, versionName, JSON.stringify(snapshotData), createdBy || null]
        );

        // Update tasks
        if (tasksToRelease.length > 0) {
          const taskIds = tasksToRelease.map(t => t.id);
          await connection.query(
            'UPDATE tasks SET released_version_id = ? WHERE id IN (?)',
            [versionId, taskIds]
          );
        }

        // Update project documents
        if (projectDocs.length > 0) {
          const docIds = projectDocs.map(d => d.id);
          await connection.query(
            'UPDATE project_documents SET version_id = ? WHERE id IN (?)',
            [versionId, docIds]
          );
        }

        // Update task documents
        if (taskDocs.length > 0) {
          const docIds = taskDocs.map(d => d.id);
          await connection.query(
            'UPDATE task_documents SET version_id = ? WHERE id IN (?)',
            [versionId, docIds]
          );
        }

        // Update comments
        if (commentsToRelease.length > 0) {
          const commentIds = commentsToRelease.map(c => c.id);
          await connection.query(
            'UPDATE task_comments SET version_id = ? WHERE id IN (?)',
            [versionId, commentIds]
          );
        }

        await connection.commit();
        res.status(201).json({ id: versionId, projectId: id, versionName, snapshotData, createdBy });

      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }

    } catch (err) {
      console.error('Error creating version', err);
      res.status(500).json({ message: err.message || 'Error creando versión' });
    }
  });

  app.get('/api/versions', async (_req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT
          v.id,
          v.project_id AS projectId,
          v.version_name AS versionName,
          u.username AS createdBy,
          v.created_at AS createdAt,
          p.name AS projectName,
          p.status AS projectStatus,
          p.workspace_id AS workspaceId
        FROM project_versions v
        LEFT JOIN projects p ON p.id = v.project_id
        LEFT JOIN users u ON u.id = v.created_by
        ORDER BY v.created_at DESC
      `);
      res.json(rows);
    } catch (err) {
      console.error('Error fetching versions', err);
      res.status(500).json({ message: 'Error obteniendo versiones' });
    }
  });

  app.get('/api/versions/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const [rows] = await pool.query('SELECT * FROM project_versions WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ message: 'Versión no encontrada' });
      }
      const version = rows[0];
      // Parse snapshot_data if it's a string
      if (typeof version.snapshot_data === 'string') {
        version.snapshotData = JSON.parse(version.snapshot_data);
      } else {
        version.snapshotData = version.snapshot_data;
      }
      delete version.snapshot_data;
      
      res.json({
        id: version.id,
        projectId: version.project_id,
        versionName: version.version_name,
        snapshotData: version.snapshotData,
        createdAt: version.created_at,
        createdBy: version.created_by
      });
    } catch (err) {
      console.error('Error fetching version details', err);
      res.status(500).json({ message: 'Error obteniendo detalles de la versión' });
    }
  });

  app.get('/api/users', async (_req, res) => {
    const [rows] = await pool.query(
      'SELECT id, username, email, role, department_id AS departmentId, active, created_at AS createdAt FROM users ORDER BY created_at DESC',
    );
    res.json(rows);
  });

  app.post('/api/users', async (req, res) => {
    try {
      const { username, email, password, role, active, departmentId } = req.body ?? {};
      if (!username || !password || !role) {
        return res.status(400).json({ message: 'username, password y role son requeridos' });
      }
      const hashed = await bcrypt.hash(password, 10);
      const id = crypto.randomUUID();
      await pool.query(
        'INSERT INTO users (id, username, email, password_hash, role, department_id, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, username, email || `${username}@local`, hashed, role, departmentId || null, active === 0 ? 0 : 1],
      );
      res.status(201).json({ id, username, email: email || '', role, departmentId: departmentId || null, active: active === 0 ? 0 : 1 });
    } catch (err) {
      console.error('Error creating user', err);
      if (err && err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'El usuario o correo ya existe' });
      }
      res.status(500).json({ message: 'Error creando usuario' });
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { username, email, password, role, active, departmentId } = req.body ?? {};
      const fields = [];
      const params = [];
      if (username) { fields.push('username = ?'); params.push(username); }
      if (email) { fields.push('email = ?'); params.push(email); }
      if (role) { fields.push('role = ?'); params.push(role); }
      if (active === 0 || active === 1) { fields.push('active = ?'); params.push(active); }
      if (departmentId !== undefined) {
        fields.push('department_id = ?');
        params.push(departmentId || null);
      }
      if (password) {
        const hashed = await bcrypt.hash(password, 10);
        fields.push('password_hash = ?');
        params.push(hashed);
      }
      if (!fields.length) {
        return res.status(400).json({ message: 'No hay campos para actualizar' });
      }
      params.push(id);
      await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, params);
      res.json({ id, username, email, role, active, departmentId });
    } catch (err) {
      console.error('Error updating user', err);
      res.status(500).json({ message: 'Error actualizando usuario' });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM users WHERE id = ?', [id]);
      res.json({ id });
    } catch (err) {
      console.error('Error deleting user', err);
      res.status(500).json({ message: 'Error eliminando usuario' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body ?? {};
      if (!username || !password) {
        return res.status(400).json({ message: 'username y password son requeridos' });
      }
      const [rows] = await pool.query(
        'SELECT id, username, email, role, password_hash, active, department_id FROM users WHERE username = ? OR email = ? LIMIT 1',
        [username, username],
      );
      if (!rows.length) {
        return res.status(401).json({ message: 'Credenciales invalidas' });
      }
      const user = rows[0];
      if (!user.active) {
        return res.status(401).json({ message: 'Usuario inactivo' });
      }
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ message: 'Credenciales invalidas' });
      }
      res.json({ ok: true, user: { id: user.id, username: user.username, role: user.role, departmentId: user.department_id } });
    } catch (err) {
      console.error('Error en login', err);
      res.status(500).json({ message: 'Error en login' });
    }
  });

  // Endpoint para refrescar la sesión del usuario
  app.get('/api/refresh-session/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const [rows] = await pool.query(
        'SELECT id, username, role, department_id FROM users WHERE id = ? LIMIT 1',
        [userId]
      );
      if (!rows.length) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }
      const user = rows[0];
      res.json({ user: { id: user.id, username: user.username, role: user.role, departmentId: user.department_id } });
    } catch (err) {
      console.error('Error refrescando sesión', err);
      res.status(500).json({ message: 'Error refrescando sesión' });
    }
  });

  // Endpoint para migrar rutas de archivos (temporal)
  app.post('/api/migrate-file-paths', async (_req, res) => {
    try {
      // Actualizar rutas de project_documents que no tienen /uploads/docs/
      const [docsResult] = await pool.query(`
        UPDATE project_documents
        SET file_path = CONCAT('/uploads/docs/', SUBSTRING_INDEX(file_path, '/', -1))
        WHERE file_path NOT LIKE '/uploads/docs/%'
      `);

      // Actualizar rutas de task_documents que no tienen /uploads/docs/
      const [tasksResult] = await pool.query(`
        UPDATE task_documents
        SET file_path = CONCAT('/uploads/docs/', SUBSTRING_INDEX(file_path, '/', -1))
        WHERE file_path NOT LIKE '/uploads/docs/%'
      `);

      res.json({
        message: 'Rutas migradas exitosamente',
        projectDocuments: docsResult.affectedRows,
        taskDocuments: tasksResult.affectedRows
      });
    } catch (err) {
      console.error('Error en migración:', err);
      res.status(500).json({ message: 'Error en la migración' });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
  
  });
}

main().catch((err) => {
  console.error('Failed to start API', err);
  process.exit(1);
});

async function initTables(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      department_id CHAR(36),
      active TINYINT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS departments (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      color VARCHAR(20) NOT NULL DEFAULT '#22d3ee',
      icon VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id CHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'development',
      start DATE,
      end DATE,
      created_by CHAR(36),
      logo VARCHAR(255),
      workspace_id CHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id CHAR(36) PRIMARY KEY,
      project_id CHAR(36) NOT NULL,
      parent_task_id CHAR(36) NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      assigned_to CHAR(36),
      status VARCHAR(50) DEFAULT 'pending',
      priority VARCHAR(20) DEFAULT 'media',
      due DATE,
      effort INT DEFAULT 0,
      department_id CHAR(36),
      released_version_id CHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (released_version_id) REFERENCES project_versions(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_versions (
      id CHAR(36) PRIMARY KEY,
      project_id CHAR(36) NOT NULL,
      version_name VARCHAR(100) NOT NULL,
      snapshot_data JSON NOT NULL,
      created_by CHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS project_documents (
      id CHAR(36) PRIMARY KEY,
      project_id CHAR(36) NOT NULL,
      version_id CHAR(36),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      file_name VARCHAR(255),
      file_path VARCHAR(500) NOT NULL,
      mime_type VARCHAR(100),
      size BIGINT,
      created_by CHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (version_id) REFERENCES project_versions(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id CHAR(36) PRIMARY KEY,
      task_id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      comment TEXT NOT NULL,
      version_id CHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (version_id) REFERENCES project_versions(id) ON DELETE SET NULL
    )
  `);

  // Add completed_at column to tasks if it doesn't exist
  try {
    await pool.query(`
      ALTER TABLE tasks
      ADD COLUMN completed_at TIMESTAMP NULL AFTER updated_at
    `);
  } catch (err) {
    // Column already exists, ignore error
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS task_documents (
      id CHAR(36) PRIMARY KEY,
      task_id CHAR(36) NOT NULL,
      project_id CHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      file_name VARCHAR(255),
      file_path VARCHAR(500) NOT NULL,
      mime_type VARCHAR(100),
      size BIGINT,
      created_by CHAR(36),
      version_id CHAR(36),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (version_id) REFERENCES project_versions(id) ON DELETE SET NULL
    )
  `);

  // Intentar agregar columnas si no existen
  try {
    await pool.query('ALTER TABLE users ADD COLUMN department_id CHAR(36)');
  } catch (err) {}
  try {
    await pool.query('ALTER TABLE users ADD COLUMN active TINYINT DEFAULT 1');
  } catch (err) {}
  try {
    await pool.query("ALTER TABLE projects ADD COLUMN status VARCHAR(20) DEFAULT 'development'");
  } catch (err) {}
  try {
    await pool.query('ALTER TABLE tasks ADD COLUMN released_version_id CHAR(36)');
    await pool.query('ALTER TABLE tasks ADD CONSTRAINT fk_tasks_version FOREIGN KEY (released_version_id) REFERENCES project_versions(id) ON DELETE SET NULL');
  } catch (err) {}
  try {
    await pool.query('ALTER TABLE projects ADD COLUMN logo VARCHAR(255)');
  } catch (err) {}
  try {
    await pool.query('ALTER TABLE projects ADD COLUMN created_by CHAR(36)');
    await pool.query('ALTER TABLE projects ADD CONSTRAINT fk_projects_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL');
  } catch (err) {}
  try {
    await pool.query('ALTER TABLE task_comments ADD COLUMN version_id CHAR(36)');
    await pool.query('ALTER TABLE task_comments ADD CONSTRAINT fk_task_comments_version FOREIGN KEY (version_id) REFERENCES project_versions(id) ON DELETE SET NULL');
  } catch (err) {}
  try {
    await pool.query('ALTER TABLE task_documents ADD COLUMN version_id CHAR(36)');
    await pool.query('ALTER TABLE task_documents ADD CONSTRAINT fk_task_documents_version FOREIGN KEY (version_id) REFERENCES project_versions(id) ON DELETE SET NULL');
  } catch (err) {}
  try {
    await pool.query('ALTER TABLE projects ADD COLUMN workspace_id CHAR(36)');
    await pool.query('ALTER TABLE projects ADD CONSTRAINT fk_projects_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL');
  } catch (err) {}

  // Insertar datos de prueba si no existen
  await insertSampleData(pool);
}

async function insertSampleData(pool) {
  // Check if departments already exist
  const [depts] = await pool.query('SELECT COUNT(*) as count FROM departments');
  if (depts[0].count > 0) return; // Already has data

  console.log('Inserting sample data...');

  // Departments
  const departments = [
    { id: crypto.randomUUID(), name: 'Desarrollo', color: '#3b82f6' },
    { id: crypto.randomUUID(), name: 'Diseño', color: '#8b5cf6' },
    { id: crypto.randomUUID(), name: 'Marketing', color: '#ec4899' },
    { id: crypto.randomUUID(), name: 'Operaciones', color: '#10b981' },
  ];

  for (const dept of departments) {
    await pool.query(
      'INSERT INTO departments (id, name, color) VALUES (?, ?, ?)',
      [dept.id, dept.name, dept.color]
    );
  }

  // Default Workspace
  const defaultWorkspace = {
    id: crypto.randomUUID(),
    name: 'General',
    description: 'Espacio de trabajo predeterminado',
    color: '#22d3ee'
  };
  
  await pool.query(
    'INSERT INTO workspaces (id, name, description, color) VALUES (?, ?, ?, ?)',
    [defaultWorkspace.id, defaultWorkspace.name, defaultWorkspace.description, defaultWorkspace.color]
  );

  // Users
  const hashedPassword = await bcrypt.hash('123456', 10);
  const users = [
    { id: crypto.randomUUID(), username: 'cmendoza', email: 'carlos@example.com', departmentId: departments[0].id },
    { id: crypto.randomUUID(), username: 'agarcia', email: 'ana@example.com', departmentId: departments[0].id },
    { id: crypto.randomUUID(), username: 'ltorres', email: 'luis@example.com', departmentId: departments[1].id },
    { id: crypto.randomUUID(), username: 'mlopez', email: 'maria@example.com', departmentId: departments[1].id },
    { id: crypto.randomUUID(), username: 'pramirez', email: 'pedro@example.com', departmentId: departments[2].id },
    { id: crypto.randomUUID(), username: 'shernandez', email: 'sofia@example.com', departmentId: departments[3].id },
  ];

  for (const user of users) {
    await pool.query(
      'INSERT INTO users (id, username, email, password_hash, role, department_id, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user.id, user.username, user.email, hashedPassword, 'user', user.departmentId, 1]
    );
  }

  // Sample Projects
  const projects = [
    {
      id: crypto.randomUUID(),
      name: 'Sistema de Gestión',
      description: 'Desarrollo del sistema principal de gestión de proyectos',
      start: '2025-01-01',
      end: '2025-06-30'
    },
    {
      id: crypto.randomUUID(),
      name: 'Aplicación Móvil',
      description: 'App móvil para clientes',
      start: '2025-02-01',
      end: '2025-05-31'
    },
  ];

  for (const project of projects) {
    await pool.query(
      'INSERT INTO projects (id, name, description, start, end) VALUES (?, ?, ?, ?, ?)',
      [project.id, project.name, project.description, project.start, project.end]
    );
  }

  // Sample Tasks for first project
  const tasks = [
    {
      id: crypto.randomUUID(),
      projectId: projects[0].id,
      parentTaskId: null,
      title: 'Diseño de Base de Datos',
      description: 'Crear el esquema de base de datos para el sistema',
      assignedTo: users[0].id,
      departmentId: departments[0].id,
      status: 'completed',
      priority: 'alta',
      due: '2025-01-15',
      effort: 40
    },
    {
      id: crypto.randomUUID(),
      projectId: projects[0].id,
      parentTaskId: null,
      title: 'Desarrollo del Backend',
      description: 'Implementar API REST con Node.js y Express',
      assignedTo: users[0].id,
      departmentId: departments[0].id,
      status: 'in-progress',
      priority: 'alta',
      due: '2025-02-28',
      effort: 80
    },
    {
      id: crypto.randomUUID(),
      projectId: projects[0].id,
      parentTaskId: null,
      title: 'Diseño de Interfaz',
      description: 'Crear mockups y prototipos de la interfaz',
      assignedTo: users[2].id,
      departmentId: departments[1].id,
      status: 'completed',
      priority: 'alta',
      due: '2025-01-20',
      effort: 30
    },
    {
      id: crypto.randomUUID(),
      projectId: projects[0].id,
      parentTaskId: null,
      title: 'Desarrollo Frontend',
      description: 'Implementar interfaz con Angular',
      assignedTo: users[1].id,
      departmentId: departments[0].id,
      status: 'in-progress',
      priority: 'alta',
      due: '2025-03-15',
      effort: 100
    },
  ];

  const taskIds = [];
  for (const task of tasks) {
    await pool.query(
      'INSERT INTO tasks (id, project_id, parent_task_id, title, description, assigned_to, status, priority, due, effort, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [task.id, task.projectId, task.parentTaskId, task.title, task.description, task.assignedTo, task.status, task.priority, task.due, task.effort, task.departmentId]
    );
    taskIds.push(task.id);
  }

  // Add subtasks to the second task (Backend)
  const subtasks = [
    {
      id: crypto.randomUUID(),
      projectId: projects[0].id,
      parentTaskId: taskIds[1],
      title: 'Configurar servidor Express',
      description: 'Setup inicial del servidor',
      assignedTo: users[0].id,
      departmentId: departments[0].id,
      status: 'completed',
      priority: 'alta',
      due: '2025-02-05',
      effort: 8
    },
    {
      id: crypto.randomUUID(),
      projectId: projects[0].id,
      parentTaskId: taskIds[1],
      title: 'Implementar endpoints de autenticación',
      description: 'Login, registro y validación de tokens',
      assignedTo: users[0].id,
      departmentId: departments[0].id,
      status: 'in-progress',
      priority: 'alta',
      due: '2025-02-12',
      effort: 16
    },
  ];

  for (const subtask of subtasks) {
    await pool.query(
      'INSERT INTO tasks (id, project_id, parent_task_id, title, description, assigned_to, status, priority, due, effort, department_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [subtask.id, subtask.projectId, subtask.parentTaskId, subtask.title, subtask.description, subtask.assignedTo, subtask.status, subtask.priority, subtask.due, subtask.effort, subtask.departmentId]
    );
  }

  console.log('Sample data inserted successfully!');
}
