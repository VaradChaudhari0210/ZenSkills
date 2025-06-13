const prisma = require("../models/prismaClient");
const nodemailer = require("nodemailer");
const {
  getJobApplicationEmailTemplate,
} = require("../misc/applyJobEmailTemplate");

const getJobDetails = async (req, res) => {
  const { jobId } = req.params;
  try {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        job_applications: true,
        mentor: true,
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    const jobDetails = {
      id: job.id,
      title: job.title,
      job_types: job.job_type ? [job.job_type] : [],
      salary: job.salary || "",
      company: job.company_name || "",
      location: job.location || "",
      applicants: `${job.job_applications.length}+`,
      moreDetails: {
        jobDescription: {
          overview: job.description || "",
          responsibilities: job.responsibilities
            ? job.responsibilities.split(", ")
            : [],
        },
        qualifications: {
          required: {
            skills: job.qualifications ? job.qualifications.split(", ") : [],
            experience: job.required_experience || "",
            education: job.required_education || "",
          },
          preferred: {
            certifications: job.preferred_certifications
              ? job.preferred_certifications.split(", ")
              : [],
            softSkills: job.preferred_soft_skills
              ? job.preferred_soft_skills.split(", ")
              : [],
            experience: job.preferred_experience || "",
          },
        },
        perksAndBenefits: job.benefits ? job.benefits.split(", ") : [],
        applicationDetails: {
          process: job.app_details ? job.app_details.split(", ") : [],
          deadline: job.deadline
            ? job.deadline.toISOString().split("T")[0]
            : "",
        },
        companyOverview: {
          name: job.company_name || "",
          description: job.company_details || "",
          culture: job.company_culture || "",
        },
        faq: {
          remoteWorkPolicy: job.remote_work_policy || "",
          workHours: job.work_hours || "",
        },
      },
    };

    res.json(jobDetails);
  } catch (error) {
    console.error("Error fetching job details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getJobs = async (req, res) => {
  const {
    search,
    location,
    jobTypes,
    minSalary,
    maxSalary,
    page = 1,
    limit = 10,
  } = req.query;

  const filters = {
    ...(search && { title: { contains: search, mode: "insensitive" } }),
    ...(location && { location: { contains: location, mode: "insensitive" } }),
    ...(jobTypes && {
      job_type: {
        in: Array.isArray(jobTypes) ? jobTypes : jobTypes.split(","),
      },
    }),
    ...(minSalary && { salary: { gte: minSalary } }),
    ...(maxSalary && { salary: { lte: maxSalary } }),
  };

  try {
    const jobs = await prisma.job.findMany({
      where: filters,
      include: {
        job_applications: true,
        mentor: true,
      },
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });

    const totalJobs = await prisma.job.count({ where: filters });

    const jobList = jobs.map((job) => ({
      id: job.id,
      title: job.title,
      jobTypes: job.job_type ? [job.job_type] : [],
      workSchedule: job.work_schedule,
      workLocation: job.work_location,
      employmentCategories: job.employment_categories,
      salary: job.salary || "",
      company: job.company_name || "",
      location: job.location || "",
      applicants: `${job.job_applications.length}+`,
    }));

    res.json({ jobs: jobList, totalJobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const createJob = async (req, res) => {
  try {
    const {
      title,
      description,
      company_name,
      company_details,
      location,
      work_schedule,
      work_location,
      employment_categories,
      qualifications,
      benefits,
      app_details,
      deadline,
      salary,
    } = req.body;

    const newJob = await prisma.job.create({
      data: {
        title,
        description,
        company_name,
        company_details,
        location,
        work_schedule,
        work_location,
        employment_categories,
        qualifications,
        benefits,
        app_details,
        mentor: {
          connect: {
            user_id: req.user.id,
          },
        },
        deadline: new Date(deadline),
        salary,
      },
    });

    res.status(201).json(newJob);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create job" });
  }
};

const updateJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // TODO - Uncomment for authentication check
    // const userId = req.user.id;

    // const job = await prisma.job.findUnique({
    //   where: { id: jobId },
    //   include: {
    //     mentor: true,
    //   },
    // });

    // if (!job) {
    //   return res.status(404).json({ error: "Job not found" });
    // }

    // if (job.mentor.userId !== userId) { // Ensure the correct field is checked
    //   return res.status(403).json({ error: "You do not have permission to update this job" });
    // }

    const {
      title,
      description,
      company_name,
      company_details,
      location,
      job_type,
      qualifications,
      benefits,
      app_details,
      posted_by,
      deadline,
      salary,
    } = req.body;

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        title,
        description,
        company_name,
        company_details,
        location,
        job_type,
        qualifications,
        benefits,
        app_details,
        posted_by,
        deadline: new Date(deadline),
        salary,
      },
    });

    res.status(200).json(updatedJob);
  } catch (error) {
    console.error("Error updating job:", error);
    res.status(500).json({ error: "Failed to update job" });
  }
};

const deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // TODO - Uncomment for authentication check
    // const userId = req.user.id;

    // const job = await prisma.job.findUnique({
    //   where: { id: jobId },
    //   include: {
    //     mentor: true,
    //   },
    // });

    // if (!job) {
    //   return res.status(404).json({ error: "Job not found" });
    // }

    // if (job.mentor.user_id !== userId) {
    //   return res.status(403).json({ error: "You do not have permission to delete this job" });
    // }

    await prisma.job.delete({
      where: { id: jobId },
    });

    res.status(200).json({ message: "Job deleted successfully" });
  } catch (error) {
    console.error("Error deleting job:", error);
    res.status(500).json({ error: "Failed to delete job" });
  }
};

const applyJob = async (req, res) => {
  const { jobId } = req.params;
  const { name, email, phone_number, cover_letter, resume_url } = req.body;

  try {
    // Fetch job details including mentor's user details
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        mentor: {
          include: {
            User: true,
          },
        },
      },
    });

    console.log(job)

    const existingApplication = await prisma.jobApplication.findFirst({
      where: {
        job_id: jobId,
        uid: req.user.id,
      },
      orderBy: {
        application_date: "desc",
      },
    });

    console.log(existingApplication)

    // Limit reapplication to 15 days
    if (existingApplication) {
      const now = new Date();
      const lastAppliedDate = new Date(existingApplication.application_date);
      const differenceInDays = Math.floor(
        (now - lastAppliedDate) / (1000 * 60 * 60 * 24),
      );

      if (differenceInDays < 15) {
        return res.status(400).json({
          error: `You can only reapply for this job after ${15 - differenceInDays} day(s).`,
        });
      }
    }

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (!job.mentor || !job.mentor.User || !job.mentor.User.email) {
      return res.status(404).json({ error: "Mentor's email not found" });
    }

    // Create job application
    const application = await prisma.jobApplication.create({
      data: {
        job_id: jobId,
        uid: req.user.id,
        name,
        phone_number:"7284876366",
        email,
        cover_letter,
        resume_url:"https://drive",
      },
    });

    console.log(application)

    // Send email to mentor
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    console.log(job.mentor.User.email);
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: job.mentor.User.email,
      subject: `🌟 New Job Application Received for ${job.title} on ZenSkills`,
      html: getJobApplicationEmailTemplate(job.title, job.company, {
        name,
        email,
        phone_number:"7284876366",
        cover_letter,
        resume_url:"https://drive",
      }),
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent to mentor");
    res.status(200).json({ message: "Application submitted successfully" });
  } catch (error) {
    console.error("Error applying for job:", error);
    res.status(500).json({ error: "Failed to apply for job" });
  }
};

const refer = async (req, res) => {
  const user_id = "a64bf567-cb35-411f-a238-ba4dc0531ab8";
  // const mentor = await prisma.User.findUnique({
  //   where:{
  //     id: user_id,
  //   },
  //   data: {
  //     include : {
  //       mentor: true,
  //     }
  //   }
  // })
  // const { jobId } = req.params;
  const { name, email,company_email, phone_number, cover_letter, resume_url } = req.body;

  try {
    // Create job application
    // const application = await prisma.jobApplication.create({
    //   data: {
    //     job_id: jobId,
    //     uid: req.user.id,
    //     name,
    //     company_email,
    //     phone_number,
    //     email,
    //     cover_letter,
    //     resume_url,
    //   },
    // });

    // Send email to mentor
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: company_email,
      subject: `🌟 New Referral Received via ZenSkills`,
      html: getJobApplicationEmailTemplate("Referral", "ZenSkills", {
        name,
        email,
        phone_number,
        cover_letter,
        resume_url,
      }),
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent to mentee");
    res.status(200).json({ message: "Referral submitted successfully" });
  } catch (error) {
    console.error("Error referring the job:", error);
    res.status(500).json({ error: "Failed to refer the job" });
  }
};

module.exports = {
  getJobDetails,
  getJobs,
  createJob,
  updateJob,
  deleteJob,
  applyJob,
  refer,
};
