<div align="center">
  <img src="public/icon.svg" alt="Lernio Logo" width="120" />
  <h1>Lernio</h1>
  
  <p>
    <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" alt="Prisma" />
  </p>

  <p><strong>A modern Educational Learning Management System built for educational institutions.</strong></p>
</div>

It provides a robust platform for managing students, delivering video content, and scheduling live classes via Zoom.

## 🚀 Features

- **Role-based Access Control**: Separate access scopes and permissions for Admins and Students.
- **Grade-based Content Delivery**: Automatically organize and restrict access to video content based on student grades (Grade 6-11).
- **Video Management**: 
  - Upload and serve videos efficiently using Cloudflare R2.
  - Custom video thumbnails hosting using ImgBB.
  - Built-in video processing with FFmpeg.
  - Track student engagement through views, likes, and comments on videos.
- **Live Classes Integration**: Seamlessly manage Zoom accounts and schedule recurring or one-off live Zoom meetings for students.
- **Custom Access Models**: Grant specific users custom access to exclusive videos beyond their standard grade level.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/)
- **Frontend**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [HeroUI](https://heroui.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL) & [Prisma ORM](https://www.prisma.io/)
- **Storage**: [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) (via AWS SDK)
- **Authentication**: Custom JWT-based session management using `jose` and `bcryptjs`
- **Video Processing**: WebAssembly-powered video processing via `@ffmpeg/ffmpeg`

## ⚙️ Prerequisites

Before you begin, ensure you have the following:
- Node.js (v20+ recommended)
- A [Supabase](https://supabase.com/) project (PostgreSQL) with connection pooling enabled
- Cloudflare R2 bucket for video storage
- ImgBB account for thumbnail hosting
- Zoom Developer account (if using live class scheduling features)

## 📦 Getting Started

### 1. Installation

Clone the repository and install the dependencies:

```bash
git clone https://github.com/Danushka-Madushan/lernio.git
cd lernio
npm install
```

### 2. Environment Configuration

Copy the sample environment file to create your local environment file:

```bash
cp .env.sample .env.local
```

Open `.env.local` and configure your keys:
- `DATABASE_URL` & `DIRECT_URL`: Your Supabase PostgreSQL connection strings (Transaction & Session modes).
- `JWT_SECRET`: Secret key for generating secure session tokens.
- `CLOUDFLARE_R2_*`: Your Cloudflare R2 bucket credentials.
- `IMGBB_API_KEY`: API key for ImgBB image hosting.

### 3. Database Setup

Generate the Prisma client and push the schema to your database:

```bash
npx prisma generate
npx prisma db push
```

*(Note: Use `npx prisma migrate dev` if you prefer managing migrations locally instead of `db push`)*

### 4. Run the Development Server

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 Key Directories

- `src/`: Main source code containing components, utility functions, and generated clients.
- `prisma/`: Prisma schema (`schema.prisma`) defining the database models.
- `public/`: Static assets such as images and icons.

## 📝 Scripts

- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Builds the application for production deployment.
- `npm run start`: Starts a Next.js production server.
- `npm run lint`: Runs ESLint to check for code issues.

## 📄 License

This project is proprietary and confidential. Unauthorized copying of files in this repository is strictly prohibited.
