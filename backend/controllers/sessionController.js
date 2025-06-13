const prisma = require("../models/prismaClient");
const { google } = require("googleapis");
const { googleClient } = require("./authController");
const { DateTime } = require("luxon");

const dayOfWeek = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

exports.getAllAvailableSessions = async (req, res) => {
  const { mentorId } = req.params;

  try {
    const sessions = await prisma.MentorSession.findMany({
      include: {
        mentor: {
          include: {
            User: true,
          },
        },
        SessionBooking: true,
      },
      where: {
        mentor: {
          id: mentorId,
        },
      },
    });

    return res.json({ sessions });
  } catch (err) {
    console.error(err);
    return res.sendStatus(500);
  }
};

exports.getSession = async (req, res) => {
  const session = await prisma.MentorSession.findUnique({
    include: {
      mentor: {
        include: {
          User: true,
        },
      },
      SessionBooking: true,
    },
    where: {
      id: req.params.id,
    },
  });

  if (session) {
    const map = {};
    const now = DateTime.utc();
    console.log(`Current time: ${now}`);

    session.SessionBooking.forEach((booking) => {

      // Skip bookings that are in the past
      const bookingEnd = DateTime.fromJSDate(booking.end_time).toUTC();
      const bookingDate = DateTime.fromJSDate(booking.date).toUTC().startOf('day');
      const today = now.startOf('day');
      
      console.log(
        `Processing booking: ${booking.id}, end time: ${bookingEnd.toISO()}`)
      if (bookingDate > today || (bookingDate.equals(today) && bookingEnd > now)) {
        const timeSlot = {
        day: DateTime.fromJSDate(booking.date).weekdayLong,
        from: DateTime.fromJSDate(booking.start_time).toFormat("hh:mm a"),
        to: DateTime.fromJSDate(booking.end_time).toFormat("hh:mm a"),
        available: !booking.user_id,
        bookingId: booking.id,
      };
      console.log(
        `Processing booking: ${JSON.stringify(timeSlot)} for day: ${timeSlot.day}`)

      const prevArray = map[timeSlot.day] ?? [];
      prevArray.push(timeSlot);
      map[timeSlot.day] = prevArray;
      }
    });

    session.timeSlots = map;
  }

  return res.json({ session });
};

exports.createSession = async (req, res) => {
  const {
    sessionName,
    eventDescription,
    sessionDuration,
    selectedTopics,
    // availability,
    type,
    price,
  } = req.body;

  try {
    const mentor = await prisma.mentor.findUnique({
      where: {
        // user_id: "154fa164-043c-42b2-a0cf-3bbae453ba15"
        user_id: req.user.id,
      },
    });

    // const timeSlots = [];

    // for (const timeSlot of availability) {
    //   if (!timeSlot.enabled) {
    //     continue;
    //   }

    //   for (const slot of timeSlot.slots) {
    //     timeSlots.push({
    //       day: timeSlot.day,
    //       from: slot.start,
    //       to: slot.end,
    //     });
    //   }
    // }

    const timeSlots = await prisma.TimeSlot.findMany({
      where: {
        mentor: {
          User: {
            id: req.user.id,
          },
        },
      },
    });

    await prisma.MentorSession.create({
      data: {
        name: sessionName,
        description: eventDescription,
        durationMinutes: sessionDuration,
        type: type,
        price: price,
        topics: {
          connect: selectedTopics.map((topic) => ({ id: topic.id })),
        },
        SessionBooking: {
          create: timeSlots
            .map((timeSlot) => {
              const startTime = DateTime.fromFormat(timeSlot.from, "HH:mm");
              const endTime = DateTime.fromFormat(timeSlot.to, "HH:mm");

              const today = DateTime.now();
              const dayIndex = dayOfWeek.indexOf(timeSlot.day);

              let date = today.set({ weekday: dayIndex });

              if (date < today) {
                date = date.plus({ weeks: 1 });
              }

              const bookings = [];
              let currentTime = startTime;

              while (currentTime < endTime) {
                const bookingEndTime = currentTime.plus({
                  minutes: sessionDuration,
                });

                if (bookingEndTime > endTime) break;

                bookings.push({
                  status: "pending",
                  start_time: currentTime.toJSDate(),
                  end_time: bookingEndTime.toJSDate(),
                  date: date.toJSDate(),
                });

                currentTime = bookingEndTime;
              }

              return bookings;
            })
            .flat(),
        },
        mentor_id: mentor.id,
      },
    });

    await prisma.mentor.update({
      where: {
        id: mentor.id,
      },
      data: {
        created_first_session: true,
      },
    });

    res.sendStatus(200);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

exports.bookSession = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const booking = await prisma.SessionBooking.findUnique({
      where: { id: bookingId },
      include: {
        session: {
          include: {
            mentor: {
              include: {
                User: true,
              },
            },
          },
        },
        user: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const session = booking.session;
    const mentor = session.mentor.User;
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      }
    })

    if (session.price > 0) {
      if (user.coins < session.price) {
        return res.status(400).json({ 
          error: "Insufficient coins", 
          currentCoins: user.coins,
          requiredCoins: session.price,
          message: `You need ${session.price} coins to book this session. Your current balance is ${user.coins} coins.`
        });
      }

      // Deduct coins from user and add to mentor
      await prisma.user.update({
        where: { id: user.id },
        data: { coins: { decrement: session.price } },
      });

      await prisma.user.update({
        where: { id: mentor.id },
        data: { coins: { increment: session.price } },
      });
      // Add transaction for user
      await prisma.Transaction.create({
        data: {
          amount: session.price,
          type: "SPENT",
          user_id: user.id,
          session_id: session.id,
        },
      });

      // Add transaction for mentor
      await prisma.Transaction.create({
        data: {
          amount: session.price,
          type: "EARN",
          user_id: mentor.id,
          session_id: session.id,
        },
      });
    }

    await prisma.SessionBooking.update({
      where: {
        id: bookingId,
      },
      data: {
        user: {
          connect: {
            id: req.user.id,
          },
        },
      },
    });

    res.status(200).json();
  } catch (error) {
    console.error("Error booking session:", error);
    res.status(500).json({ error: "Error booking session" });
  }
};

exports.getAllTopics = async (req, res) => {
  res.json({ topics: await prisma.MentorSessionTopic.findMany() });
};

exports.updateSession = async (req, res) => {
  const { id } = req.params;
  const {
    sessionName,
    eventDescription,
    sessionDuration,
    selectedTopics,
    // availability,
  } = req.body;

  try {
    const session = await prisma.MentorSession.findUnique({
      where: { id },
      include: { mentor: true },
    });

    if (
      !session ||
      session.mentor.length === 0 ||
      session.mentor.user_id !== req.user.id
    ) {
      return res.sendStatus(403);
    }

    const mentor = await prisma.mentor.findUnique({
      where: {
        user_id: req.user.id,
      },
    });

    // const timeSlots = [];

    // for (const timeSlot of availability) {
    //   if (!timeSlot.enabled) {
    //     continue;
    //   }

    //   for (const slot of timeSlot.slots) {
    //     timeSlots.push({
    //       day: timeSlot.day,
    //       from: slot.start,
    //       to: slot.end,
    //     });
    //   }
    // }

    const updatedSession = await prisma.MentorSession.update({
      where: { id },
      data: {
        name: sessionName,
        description: eventDescription,
        durationMinutes: sessionDuration,
        topics: {
          set: selectedTopics.map((topic) => ({ id: topic.id })),
        },
        // timeSlots: {
        //   deleteMany: {},
        //   create: timeSlots,
        // },
        mentor_id: mentor.id,
      },
    });

    res.json(updatedSession);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

exports.deleteSession = async (req, res) => {
  const { id } = req.params;

  try {
    const session = await prisma.MentorSession.findUnique({
      where: { id },
      include: { mentor: true },
    });

    if (!session || session.mentor.user_id !== req.user.id) {
      return res.sendStatus(403);
    }

    // await prisma.timeSlot.deleteMany({
    //   where: {
    //     session_id: id, // Delete TimeSlots where session_id matches
    //   },
    // });

    await prisma.MentorSession.delete({
      where: { id: id },
    });

    res.sendStatus(204);
  } catch (err) {
    console.log(err);
    res.sendStatus(500);
  }
};

exports.createTimeSlots = async (req, res) => {
  const { availability } = req.body;

  try {
    const mentor = await prisma.mentor.findUnique({
      where: {
        user_id: req.user.id,
      },
    });

    const timeSlots = [];

    for (const timeSlot of availability) {
      if (!timeSlot.enabled) {
        continue;
      }

      for (const slot of timeSlot.slots) {
        timeSlots.push({
          day: timeSlot.day,
          from: slot.start,
          to: slot.end,
          mentor_id: mentor.id,
        });
      }
    }

    await prisma.TimeSlot.createMany({
      data: timeSlots,
    });

    res.status(201).json({ message: "Time slots created successfully" });
  } catch (error) {
    console.error("Error creating time slots:", error);
    res.status(500).json({ error: "Error creating time slots" });
  }
};

exports.updateBookingStatus = async (req, res) => {
  const { bookingId } = req.params;
  const { status, newStartTime, newEndTime, newDate } = req.body;

  try {
    // Check if the booking exists
    const booking = await prisma.SessionBooking.findUnique({
      where: { id: bookingId },
      include: {
        session: {
          include: {
            mentor: {
              include: {
                User: true,
              },
            },
          },
        },
        user: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    let updatedBooking;

    if (status === "accepted") {
      // Convert start_time and end_time to DateTime objects
      const startTime = new Date(booking.start_time);
      const endTime = new Date(booking.end_time);
      const bookingDate = new Date(booking.date);

      // Ensure the event is added on the specified date
      startTime.setFullYear(
        bookingDate.getFullYear(),
        bookingDate.getMonth(),
        bookingDate.getDate(),
      );
      endTime.setFullYear(
        bookingDate.getFullYear(),
        bookingDate.getMonth(),
        bookingDate.getDate(),
      );

      // Add event to Google Calendar for both user and mentor
      const event = {
        summary: booking.session.name,
        description: booking.session.description,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: "Asia/Kolkata",
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: "Asia/Kolkata",
        },
        attendees: [
          { email: booking.session.mentor.User.email },
          { email: booking.user.email },
        ],
      };

      if (booking.session.mentor.User.googleRefreshToken) {
        // Add event to mentor's Google Calendar
        googleClient.setCredentials({
          refresh_token: booking.session.mentor.User.googleRefreshToken,
        });
        const calendar = google.calendar({ version: "v3", auth: googleClient });
        const mentorEvent = await calendar.events.insert({
          calendarId: "primary",
          resource: event,
        });

        // Store event IDs for future reference
        updatedBooking = await prisma.SessionBooking.update({
          where: { id: bookingId },
          data: {
            status,
            event_id: mentorEvent.data.id,
          },
        });
      } else {
        // Store event IDs for future reference
        updatedBooking = await prisma.SessionBooking.update({
          where: { id: bookingId },
          data: {
            status,
            // event_id: mentorEvent.data.id,
          },
        });
      }
    } else if (status === "rejected") {
      const booking = await prisma.SessionBooking.findUnique({
        where: { id: bookingId },
      });

      updatedBooking = await prisma.SessionBooking.update({
        where: { id: bookingId },
        data: { status: "pending", user_id: null },
      });

      delete booking.id;
      booking.status = "rejected";

      await prisma.SessionBooking.create({
        data: booking,
      });

      // Refund coins to user and deduct from mentor
      if (booking.session.price > 0) {
        await prisma.user.update({
          where: { id: booking.user.id },
          data: { coins: { increment: booking.session.price } },
        });

        await prisma.user.update({
          where: { id: booking.session.mentor.User.id },
          data: { coins: { decrement: booking.session.price } },
        });

        // Add transaction for user
        await prisma.Transaction.create({
          data: {
            amount: session.price,
            type: "REFUND",
            user_id: user.id,
            session_id: session.id,
          },
        });

        // Add transaction for mentor
        await prisma.Transaction.create({
          data: {
            amount: session.price,
            type: "RETURN",
            user_id: mentor.id,
            session_id: session.id,
          },
        });
      }

    } else if (status === "cancelled" && booking.status === "accepted") {
      if (booking.session.mentor.User.googleRefreshToken) {
        // Delete event from mentor's Google Calendar
        googleClient.setCredentials({
          refresh_token: booking.session.mentor.User.googleRefreshToken,
        });
        const calendar = google.calendar({ version: "v3", auth: googleClient });
        await calendar.events.delete({
          calendarId: "primary",
          eventId: booking.event_id,
        });
      }
      updatedBooking = await prisma.SessionBooking.update({
        where: { id: bookingId },
        data: {
          status,
          user_id: null,
          event_id: null,
        },
      });
      // Refund coins to user and deduct from mentor
      if (booking.session.price > 0) {
        await prisma.user.update({
          where: { id: booking.user.id },
          data: { coins: { increment: booking.session.price } },
        });

        await prisma.user.update({
          where: { id: booking.session.mentor.User.id },
          data: { coins: { decrement: booking.session.price } },
        });
      }
    } else if (status === "rescheduled") {
      if (!newStartTime || !newEndTime || !newDate) {
        return res.status(400).json({
          error:
            "newStartTime, newEndTime, and newDate are required for rescheduling",
        });
      }

      // Reschedule the meeting
      const newStartDateTime = new Date(`${newDate}T${newStartTime}:00`);
      const newEndDateTime = new Date(`${newDate}T${newEndTime}:00`);

      if (booking.session.mentor.User.googleRefreshToken) {
        // Update the event in Google Calendar
        googleClient.setCredentials({
          refresh_token: booking.session.mentor.User.googleRefreshToken,
        });
        const calendar = google.calendar({ version: "v3", auth: googleClient });
        if (booking.event_id) {
          await calendar.events.update({
            calendarId: "primary",
            eventId: booking.event_id,
            resource: {
              start: {
                dateTime: newStartDateTime.toISOString(),
                timeZone: "Asia/Kolkata",
              },
              end: {
                dateTime: newEndDateTime.toISOString(),
                timeZone: "Asia/Kolkata",
              },
            },
          });
        }
      }

      if (booking.user.googleRefreshToken) {
        // Update the event in user's Google Calendar
        googleClient.setCredentials({
          refresh_token: booking.user.googleRefreshToken,
        });
        await calendar.events.update({
          calendarId: "primary",
          eventId: booking.event_id,
          resource: {
            start: {
              dateTime: newStartDateTime.toISOString(),
              timeZone: "Asia/Kolkata",
            },
            end: {
              dateTime: newEndDateTime.toISOString(),
              timeZone: "Asia/Kolkata",
            },
          },
        });
      }

      // Update the booking in the database
      updatedBooking = await prisma.SessionBooking.update({
        where: { id: bookingId },
        data: {
          start_time: newStartDateTime,
          end_time: newEndDateTime,
          date: new Date(newDate),
          status,
        },
      });
    } else if (status === "completed") {
      updatedBooking = await prisma.SessionBooking.update({
        where: { id: bookingId },
        data: {
          status,
        },
      })
      const newMenteeCnt = await prisma.mentor.update({
        where: { id: booking.session.mentor },
        data: {
          number_of_sessions: {
            increment: 1
          }
        }
      })
    }
    res.status(200).json(updatedBooking);
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ error: "Error updating booking status" });
  }
};

exports.getAvailableTimeSlots = async (req, res) => {
  const { sessionId } = req.params;
  const { date } = req.query;

  try {
    // Fetch the session details
    const session = await prisma.MentorSession.findUnique({
      where: { id: sessionId },
      include: {
        mentor: {
          include: {
            User: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Fetch the mentor's time slots
    const dayOfWeek = new Date(date)
      .toLocaleString("en-US", { weekday: "long" })
      .toUpperCase();
    // const dayOfWeek = "MONDAY";
    console.log(`Fetching time slots for day: ${dayOfWeek}`);
    const timeSlots = await prisma.TimeSlot.findMany({
      where: { mentor_id: session.mentor_id, day: dayOfWeek },
    });
    console.log(`Time slots found: ${JSON.stringify(timeSlots)}`);

    const availableTimeSlots = [];

    for (const timeSlot of timeSlots) {
      const startTime = new Date(`${date}T${timeSlot.from}:00Z`);
      const endTime = new Date(`${date}T${timeSlot.to}:00Z`);
      const duration = session.durationMinutes * 60 * 1000; // Convert minutes to milliseconds

      let currentTime = startTime;

      while (currentTime.getTime() + duration <= endTime.getTime()) {
        const slotStart = new Date(currentTime);
        const slotEnd = new Date(currentTime.getTime() + duration);

        // Check for conflicts in the mentor's Google Calendar
        googleClient.setCredentials({
          refresh_token: session.mentor.User.googleRefreshToken,
        });
        const calendar = google.calendar({ version: "v3", auth: googleClient });
        const events = await calendar.events.list({
          calendarId: "primary",
          timeMin: slotStart.toISOString(),
          timeMax: slotEnd.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
          timeZone: "Asia/Kolkata",
        });
        console.log(
          `Checking events from ${slotStart.toISOString()} to ${slotEnd.toISOString()}`,
        );
        console.log(`Events found: ${JSON.stringify(events.data.items)}`);

        if (events.data.items.length === 0) {
          availableTimeSlots.push({
            day: timeSlot.day,
            date: date,
            from: slotStart.toISOString().split("T")[1].substring(0, 5),
            to: slotEnd.toISOString().split("T")[1].substring(0, 5),
          });
        }
        currentTime = new Date(currentTime.getTime() + duration);
      }
    }
    console.log(`Available time slots: ${JSON.stringify(availableTimeSlots)}`);
    res.status(200).json({ availableTimeSlots });
  } catch (error) {
    console.error("Error fetching available time slots:", error);
    res.status(500).json({ error: "Error fetching available time slots" });
  }
};

exports.updateTimeSlots = async (req, res) => {
  const { mentorId } = req.params;
  const { availability } = req.body;

  try {
    // Check if the mentor exists
    const mentor = await prisma.mentor.findUnique({
      where: { id: mentorId },
      include: {
        User: true,
      },
    });

    if (!mentor) {
      return res.status(404).json({ error: "Mentor not found" });
    }

    // Fetch existing time slots
    const existingTimeSlots = await prisma.TimeSlot.findMany({
      where: { mentor_id: mentorId },
    });

    const timeSlotsToCreate = [];
    const timeSlotsToDelete = [];

    // Create a set of existing time slots for easy lookup
    const existingTimeSlotsSet = new Set(
      existingTimeSlots.map((ts) => `${ts.day}-${ts.from}-${ts.to}`),
    );

    // Identify time slots to create and delete
    for (const timeSlot of availability) {
      for (const slot of timeSlot.slots) {
        const slotKey = `${timeSlot.day}-${slot.start}-${slot.end}`;
        if (!existingTimeSlotsSet.has(slotKey)) {
          // Create new time slot
          timeSlotsToCreate.push({
            day: timeSlot.day,
            from: slot.start,
            to: slot.end,
            mentor_id: mentorId,
          });
        }
      }
    }

    // Identify time slots to delete
    for (const existingSlot of existingTimeSlots) {
      const slotKey = `${existingSlot.day}-${existingSlot.from}-${existingSlot.to}`;
      const isSlotInAvailability = availability.some((timeSlot) =>
        timeSlot.slots.some(
          (slot) =>
            timeSlot.day === existingSlot.day &&
            slot.start === existingSlot.from &&
            slot.end === existingSlot.to,
        ),
      );
      if (!isSlotInAvailability) {
        timeSlotsToDelete.push(existingSlot.id);
      }
    }

    // Delete time slots
    if (timeSlotsToDelete.length > 0) {
      await prisma.TimeSlot.deleteMany({
        where: { id: { in: timeSlotsToDelete } },
      });
    }

    // Create new time slots
    if (timeSlotsToCreate.length > 0) {
      await prisma.TimeSlot.createMany({
        data: timeSlotsToCreate,
      });
    }

    res.status(200).json({ message: "Time slots updated successfully" });
  } catch (error) {
    console.error("Error updating time slots:", error);
    res.status(500).json({ error: "Error updating time slots" });
  }
};

exports.getAllUserSessions = async (req, res) => {
  const { status } = req.query;

  const where = {};

  if (req.user.role === "mentor") {
    where.session = {
      mentor: {
        user_id: req.user.id,
      },
    };
    where.user = {
      isNot: null,
    };
  } else if (req.user.role === "mentee") {
    where.user_id = req.user.id;
  }

  if (status) {
    where.status = {
      in: status.split(","),
    };
  }

  const bookings = await prisma.SessionBooking.findMany({
    include: {
      session: {
        include: {
          mentor: {
            include: {
              User: true,
            },
          },
        },
      },
      user: true,
    },
    where: where,
    orderBy: [
      {
        date: "asc",
      },
      {
        start_time: "asc",
      },
    ],
  });

  res.json({ bookings });
};

exports.setSessionRoomId = async (req, res) => {
  const { id } = req.params;
  const { room_id } = req.body;

  await prisma.SessionBooking.update({
    where: { id },
    data: { room_id },
  });

  res.sendStatus(200);
};

exports.getAcceptedSessions = async (req, res) => {
  const where = {};

  where.status = "accepted";

  if (req.user.role === "mentor") {
    where.session = {
      mentor: {
        user_id: req.user.id,
      },
    };
    where.user = {
      isNot: null,
    };
  } else if (req.user.role === "mentee") {
    where.user_id = req.user.id;
  }

  const bookings = await prisma.SessionBooking.findMany({
    include: {
      session: {
        include: {
          mentor: {
            include: {
              User: true,
            },
          },
        },
      },
      user: true,
    },
    where: where,
    orderBy: [
      {
        date: "asc",
      },
      {
        start_time: "asc",
      },
    ],
  });

  res.json({ bookings });
};
