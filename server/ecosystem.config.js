module.exports = {

  apps: [{

    name: 'sisproyect-api',

    script: './index.js',

    cwd: '/home/ubuntu/Sisproyect/server',

    instances: 1,

    exec_mode: 'fork',

    env: {

      NODE_ENV: 'production',

      PORT: 3000,

      CORS_ORIGIN: 'http://107.21.163.64',

      DB_HOST: '18.211.75.118',

      DB_USER: 'root',

      DB_PASSWORD: '04nm2fdLefCxM',

      DB_NAME: 'sisproyect',

      DB_PORT: 3306,

      UPLOAD_DIR: '/home/ubuntu/Sisproyect/public/uploads/docs'

    },

    error_file: '/home/ubuntu/logs/api-error.log',

    out_file: '/home/ubuntu/logs/api-out.log',

    time: true

  }]

};
