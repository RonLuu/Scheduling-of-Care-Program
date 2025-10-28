// server/services/budgetMonitor.js
import User from "../models/User.js";
import Person from "../models/PersonWithNeeds.js";
import PersonUserLink from "../models/PersonUserLink.js";
import CareTask from "../models/CareTask.js";
import CareNeedItem from "../models/CareNeedItem.js";
import BudgetPlan from "../models/BudgetPlan.js";
import { checkAndSendBudgetAlerts } from "./emailService.js";

// Simple warning function - only for overspending
function makeWarn(spent, budget) {
  if (budget > 0) {
    if (spent > budget) {
      return {
        level: "serious",
        message: "Expense exceeds annual budget",
      };
    }
    if (spent >= 0.8 * budget) {
      return {
        level: "light",
        message: "Expense ≥80% of annual budget",
      };
    }
  } else if (spent > 0) {
    return {
      level: "medium",
      message: "No budget set - please set budget",
    };
  }
  return null;
}

// Calculate budget status for a person/year using BudgetPlans and CareTasks
async function calculateBudgetStatus(personId, year) {
  const y = Number(year);
  const from = new Date(Date.UTC(y, 0, 1));
  const to = new Date(Date.UTC(y + 1, 0, 1));

  // Get person details
  const person = await Person.findById(personId).lean();
  if (!person) {
    throw new Error("Person not found");
  }

  console.log(
    `Looking for budget plan with personId: ${person._id}, organizationId: ${person.organizationId}, year: ${y}`
  );

  // Get the budget plan for this person and year
  const budgetPlan = await BudgetPlan.findOne({
    personId: person._id,
    organizationId: person.organizationId,
    year: y,
    status: "Active",
  }).lean();

  console.log(
    `Found budget plan:`,
    budgetPlan
      ? {
          id: budgetPlan._id,
          yearlyBudget: budgetPlan.yearlyBudget,
          categoriesCount: budgetPlan.categories?.length || 0,
        }
      : "No budget plan found"
  );

  if (!budgetPlan) {
    console.log(`No budget plan found for person ${person.name} in year ${y}`);
    return {
      personId,
      year: y,
      annualBudget: 0,
      warnings: { summary: null },
      spent: { completed: 0, total: 0 },
      balance: { current: 0 },
      categories: [],
    };
  }

  // Calculate total spending from completed tasks
  const completedTasks = await CareTask.aggregate([
    {
      $match: {
        personId: person._id,
        organizationId: person.organizationId,
        status: "Completed",
        dueDate: { $gte: from, $lt: to },
        cost: { $ne: null },
      },
    },
    { $group: { _id: null, total: { $sum: "$cost" } } },
  ]);
  const completedSpend = completedTasks[0]?.total || 0;

  // Calculate total annual budget from budget plan
  const annualBudget = budgetPlan.yearlyBudget || 0;
  const totalSpent = completedSpend;

  console.log(`Budget calculation for ${person.name}:`, {
    annualBudget,
    totalSpent,
    percentage:
      annualBudget > 0 ? Math.round((totalSpent / annualBudget) * 100) : 0,
  });

  // Calculate spending by individual budget items
  const spendingByItem = await CareTask.aggregate([
    {
      $match: {
        personId: person._id,
        organizationId: person.organizationId,
        status: "Completed",
        dueDate: { $gte: from, $lt: to },
        cost: { $ne: null },
        budgetItemId: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: {
          categoryId: "$budgetCategoryId",
          itemId: "$budgetItemId",
        },
        spent: { $sum: "$cost" },
      },
    },
  ]);

  console.log(
    `Found ${spendingByItem.length} item spending records:`,
    spendingByItem
  );

  // Build categories and items with budget and spending info
  const categories = [];
  let hasItemWarnings = false;

  for (const category of budgetPlan.categories || []) {
    const categoryData = {
      category: category.name,
      id: category.id,
      annualBudget: category.budget || 0,
      totalSpent: 0,
      warning: null,
      currentBalance: category.budget || 0,
      items: [],
    };

    // Process each item in the category
    for (const item of category.items || []) {
      const itemSpending = spendingByItem.find(
        (s) =>
          s._id.categoryId === category.id &&
          String(s._id.itemId) === String(item._id)
      );
      const itemSpent = itemSpending?.spent || 0;
      const itemBudget = item.budget || 0;

      const itemData = {
        name: item.name,
        id: item._id,
        budget: itemBudget,
        spent: itemSpent,
        warning: makeWarn(itemSpent, itemBudget),
        currentBalance: itemBudget - itemSpent,
        percentage:
          itemBudget > 0 ? Math.round((itemSpent / itemBudget) * 100) : 0,
      };

      // Check if this item has warnings
      if (
        itemData.warning?.level === "light" ||
        itemData.warning?.level === "serious"
      ) {
        hasItemWarnings = true;
        console.log(
          `⚠️ Item warning: ${item.name} - spent $${itemSpent} of $${itemBudget} (${itemData.percentage}%)`
        );
      }

      categoryData.items.push(itemData);
      categoryData.totalSpent += itemSpent;
    }

    categoryData.currentBalance =
      categoryData.annualBudget - categoryData.totalSpent;
    categoryData.warning = makeWarn(
      categoryData.totalSpent,
      categoryData.annualBudget
    );

    categories.push(categoryData);
  }

  return {
    personId,
    year: y,
    annualBudget,
    warnings: {
      summary: makeWarn(totalSpent, annualBudget),
    },
    spent: {
      completed: completedSpend,
      total: totalSpent,
    },
    balance: {
      current: annualBudget - totalSpent,
    },
    categories,
    hasItemWarnings,
  };
}

/**
 * Check budget status and send email alerts if threshold is exceeded
 * This should be called after any expense is recorded
 */
export async function checkBudgetAndNotify(personId, year) {
  try {
    console.log(
      "[checkBudgetAndNotify] Starting with personId:",
      personId,
      "year:",
      year
    );

    // Get the person/client details (force fresh read, no cache)
    const person = await Person.findById(personId).lean().exec();
    if (!person) {
      console.log("Person not found for budget check:", personId);
      return;
    }

    console.log("[checkBudgetAndNotify] Found person:", {
      id: person._id,
      name: person.name,
      organizationId: person.organizationId,
    });

    // Get all users linked to this person (Family, PoA, Admin in the organization)
    const userLinks = await PersonUserLink.find({
      personId: personId,
      active: true,
    });

    console.log(
      `Found ${userLinks.length} PersonUserLink records for person ${person.name}`
    );

    // Also get organization admins if person is in an organization
    let adminUsers = [];
    // if (person.organizationId) {
    //   adminUsers = await User.find({
    //     organizationId: person.organizationId,
    //     role: 'Admin',
    //     isActive: true,
    //     'emailPreferences.budgetAlerts': true
    //   });
    //   console.log(`Found ${adminUsers.length} admin users in organization`);
    // }

    // Get linked users
    const linkedUserIds = userLinks.map((link) => link.userId);

    // Also check for the creator/owner of the person (fallback)
    if (linkedUserIds.length === 0 && person.createdByUserId) {
      console.log(
        "No PersonUserLinks found, checking creator:",
        person.createdByUserId
      );
      linkedUserIds.push(person.createdByUserId);
    }

    console.log("Linked user IDs:", linkedUserIds);

    const linkedUsers = await User.find({
      _id: { $in: linkedUserIds },
      isActive: true,
      "emailPreferences.budgetAlerts": true,
    });

    console.log(
      `Found ${linkedUsers.length} linked users with notifications enabled`
    );

    // Combine all users who should be notified
    const allUsersToNotify = [...linkedUsers, ...adminUsers];

    // Remove duplicates
    const uniqueUsers = Array.from(
      new Map(
        allUsersToNotify.map((user) => [user._id.toString(), user])
      ).values()
    );

    if (uniqueUsers.length === 0) {
      console.log("No users to notify for person:", person.name);
      return;
    }

    // Calculate budget status directly
    const budgetReport = await calculateBudgetStatus(personId, year);

    console.log("Budget report for", person.name, ":", {
      annualBudget: budgetReport.annualBudget,
      totalSpent: budgetReport.spent.total,
      percentage:
        budgetReport.annualBudget > 0
          ? Math.round(
              (budgetReport.spent.total / budgetReport.annualBudget) * 100
            )
          : 0,
      warning: budgetReport.warnings?.summary,
    });

    // Check if any budget items exceed the threshold
    const hasOverallWarnings =
      budgetReport.warnings?.summary?.level === "light" ||
      budgetReport.warnings?.summary?.level === "serious";

    const hasCategoryWarnings = (budgetReport.categories || []).some(
      (cat) =>
        cat.warning?.level === "light" || cat.warning?.level === "serious"
    );

    // Check for item-level warnings (this is the main trigger)
    const hasItemWarnings =
      budgetReport.hasItemWarnings ||
      (budgetReport.categories || []).some((cat) =>
        (cat.items || []).some(
          (item) =>
            item.warning?.level === "light" || item.warning?.level === "serious"
        )
      );

    if (!hasOverallWarnings && !hasCategoryWarnings && !hasItemWarnings) {
      console.log("No budget warnings for person:", person.name);
      return;
    }

    if (hasItemWarnings) {
      console.log(
        "⚠️ Item-level budget warnings detected for person:",
        person.name
      );
    }

    // Send notifications to each user
    for (const user of uniqueUsers) {
      try {
        // Check user's threshold preference
        const threshold = user.emailPreferences?.budgetThreshold || 80;

        // Calculate overall percentage
        const overallPercentage =
          budgetReport.annualBudget > 0
            ? Math.round(
                (budgetReport.spent.total / budgetReport.annualBudget) * 100
              )
            : 0;

        // Check if we should send alert based on user's threshold
        let shouldSendAlert = false;

        // Check overall budget threshold
        if (overallPercentage >= threshold) {
          shouldSendAlert = true;
        }

        // Check category-level thresholds
        const exceedsCategoryThreshold = (budgetReport.categories || []).some(
          (cat) => {
            const catPercentage =
              cat.annualBudget > 0
                ? Math.round((cat.totalSpent / cat.annualBudget) * 100)
                : 0;
            return catPercentage >= threshold;
          }
        );

        if (exceedsCategoryThreshold) {
          shouldSendAlert = true;
        }

        // Check item-level thresholds (main trigger)
        const exceedsItemThreshold = (budgetReport.categories || []).some(
          (cat) =>
            (cat.items || []).some((item) => {
              const itemPercentage =
                item.budget > 0
                  ? Math.round((item.spent / item.budget) * 100)
                  : 0;
              if (itemPercentage >= threshold) {
                console.log(
                  `🚨 Item threshold exceeded: ${item.name} - ${itemPercentage}% (threshold: ${threshold}%)`
                );
                return true;
              }
              return false;
            })
        );

        if (exceedsItemThreshold) {
          shouldSendAlert = true;
        }

        if (!shouldSendAlert) {
          console.log(
            `No thresholds exceeded for user ${user.email} (threshold: ${threshold}%)`
          );
          continue;
        }

        // Check if we've already sent an alert recently (within 24 hours)
        // TEMPORARILY DISABLED FOR TESTING
        /*
        const lastAlertKey = `${personId}_${year}`;
        const lastAlertTime = user.emailPreferences?.lastBudgetAlertSent?.get(lastAlertKey);
        
        if (lastAlertTime) {
          const hoursSinceLastAlert = (Date.now() - new Date(lastAlertTime).getTime()) / (1000 * 60 * 60);
          if (hoursSinceLastAlert < 24) {
            console.log(`Skipping email for ${user.email} - alert sent ${hoursSinceLastAlert.toFixed(1)} hours ago`);
            continue;
          }
        }
        */

        // Send the alert
        const alertResults = await checkAndSendBudgetAlerts(
          user,
          person,
          budgetReport
        );

        if (alertResults.length > 0 && alertResults.some((r) => r.success)) {
          // Update last alert time
          const lastAlertKey = `${personId}_${year}`;
          await User.findByIdAndUpdate(user._id, {
            [`emailPreferences.lastBudgetAlertSent.${lastAlertKey}`]:
              new Date(),
          });

          console.log(
            `Budget alert email sent to ${user.email} for ${person.name}`
          );
        }
      } catch (error) {
        console.error(`Error sending alert to ${user.email}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in budget monitoring:", error);
  }
}

/**
 * Run a scheduled check for all clients
 * This could be run daily or weekly via a cron job
 */
export async function runScheduledBudgetCheck() {
  try {
    const currentYear = new Date().getFullYear();

    // Get all active persons with budgets
    const persons = await Person.find({ isActive: true });

    console.log(
      `Running scheduled budget check for ${persons.length} clients...`
    );

    for (const person of persons) {
      await checkBudgetAndNotify(person._id, currentYear);
    }

    console.log("Scheduled budget check completed");
  } catch (error) {
    console.error("Error in scheduled budget check:", error);
  }
}

export default {
  checkBudgetAndNotify,
  runScheduledBudgetCheck,
};
