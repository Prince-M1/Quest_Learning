import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { student_id, type } = await req.json();

    if (!student_id) {
      return Response.json({ error: 'student_id required' }, { status: 400 });
    }

    // Fetch existing achievements
    const existingAchievements = await base44.asServiceRole.entities.Achievement.filter({
      student_id: student_id
    });
    const earnedAchievementNames = existingAchievements.map(a => a.name);

    // Day Streak Achievements
    if (type === 'streak' || type === 'all') {
      const sessions = await base44.asServiceRole.entities.LearningSession.filter({
        student_id: student_id,
        completed: true
      }, '-end_time');

      if (sessions.length > 0) {
        // Calculate consecutive days
        const days = new Set();
        sessions.forEach(session => {
          if (session.end_time) {
            const date = new Date(session.end_time).toDateString();
            days.add(date);
          }
        });

        const sortedDates = Array.from(days)
          .map(d => new Date(d))
          .sort((a, b) => b - a);

        let consecutiveDays = 0;
        if (sortedDates.length > 0) {
          consecutiveDays = 1;
          for (let i = 0; i < sortedDates.length - 1; i++) {
            const diff = (sortedDates[i] - sortedDates[i + 1]) / (1000 * 60 * 60 * 24);
            if (diff === 1) {
              consecutiveDays++;
            } else {
              break;
            }
          }
        }

        // Check streak milestones
        const streakMilestones = [
          { days: 3, name: 'Rising Star', criteria: '3 days consecutive' },
          { days: 7, name: 'Dedicated Learner', criteria: '7 days consecutive' },
          { days: 14, name: 'Persistent Scholar', criteria: '14 days consecutive' },
          { days: 30, name: 'Learning Veteran', criteria: '30 days consecutive' },
          { days: 60, name: 'Master of Consistency', criteria: '60 days consecutive' }
        ];

        for (const milestone of streakMilestones) {
          if (consecutiveDays >= milestone.days && !earnedAchievementNames.includes(milestone.name)) {
            await base44.asServiceRole.entities.Achievement.create({
              student_id: student_id,
              type: 'Day Streak',
              name: milestone.name,
              criteria: milestone.criteria,
              date_awarded: new Date().toISOString()
            });
            earnedAchievementNames.push(milestone.name);
          }
        }
      }
    }

    // Subtopic Learning Achievements
    if (type === 'learning' || type === 'all') {
      const progress = await base44.asServiceRole.entities.StudentProgress.filter({
        student_id: student_id,
        learned_status: true
      });

      const subtopicsLearned = progress.length;

      const learningMilestones = [
        { count: 5, name: 'Curious Beginner', criteria: '5 subtopics' },
        { count: 15, name: 'Knowledge Seeker', criteria: '15 subtopics' },
        { count: 30, name: 'Focused Learner', criteria: '30 subtopics' },
        { count: 50, name: 'Subject Specialist', criteria: '50 subtopics' },
        { count: 100, name: 'Ultimate Scholar', criteria: '100 subtopics' }
      ];

      for (const milestone of learningMilestones) {
        if (subtopicsLearned >= milestone.count && !earnedAchievementNames.includes(milestone.name)) {
          await base44.asServiceRole.entities.Achievement.create({
            student_id: student_id,
            type: 'Subtopic Learning',
            name: milestone.name,
            criteria: milestone.criteria,
            date_awarded: new Date().toISOString()
          });
          earnedAchievementNames.push(milestone.name);
        }
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Achievement check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});