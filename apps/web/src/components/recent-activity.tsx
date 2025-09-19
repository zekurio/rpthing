"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Clock, Edit, Plus, Sword, Target, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

type ActivityItem = {
	type:
		| "character_created"
		| "character_updated"
		| "trait_created"
		| "trait_updated"
		| "realm_joined";
	entityId: string;
	entityName: string;
	realmId: string;
	realmName: string;
	userId: string;
	userName: string;
	userImage?: string | null;
	timestamp: Date;
};

interface ActivityIconProps {
	type: ActivityItem["type"];
	className?: string;
}

function ActivityIcon({ type, className }: ActivityIconProps) {
	const iconClass = `h-4 w-4 ${className || ""}`;

	switch (type) {
		case "character_created":
			return <Plus className={`${iconClass} text-green-300`} />;
		case "character_updated":
			return <Edit className={`${iconClass} text-blue-300`} />;
		case "trait_created":
			return <Target className={`${iconClass} text-purple-300`} />;
		case "trait_updated":
			return <Edit className={`${iconClass} text-orange-300`} />;
		case "realm_joined":
			return <UserPlus className={`${iconClass} text-cyan-300`} />;
		default:
			return <Sword className={iconClass} />;
	}
}

function ActivityDescription({ activity }: { activity: ActivityItem }) {
	const getDescription = () => {
		switch (activity.type) {
			case "character_created":
				return `created character "${activity.entityName}"`;
			case "character_updated":
				return `updated character "${activity.entityName}"`;
			case "trait_created":
				return `created trait "${activity.entityName}"`;
			case "trait_updated":
				return `updated trait "${activity.entityName}"`;
			case "realm_joined":
				return `joined realm "${activity.realmName}"`;
			default:
				return "Unknown activity";
		}
	};

	return (
		<div className="flex items-start gap-3">
			<ActivityIcon type={activity.type} />
			<div className="min-w-0 flex-1">
				<p className="text-sm">
					<span className="font-medium">{activity.userName}</span>{" "}
					{getDescription()}
				</p>
				<div className="mt-1 flex items-center gap-2">
					<Badge variant="secondary" className="text-xs">
						{activity.realmName}
					</Badge>
					<span className="flex items-center gap-1 text-muted-foreground text-xs">
						<Clock className="h-3 w-3" />
						{formatDistanceToNow(activity.timestamp, { addSuffix: true })}
					</span>
				</div>
			</div>
			<Avatar className="h-8 w-8 shrink-0">
				<AvatarImage src={activity.userImage || undefined} />
				<AvatarFallback className="text-xs">
					{activity.userName[0]?.toUpperCase()}
				</AvatarFallback>
			</Avatar>
		</div>
	);
}

interface RecentActivityProps {
	unstyled?: boolean;
}

export function RecentActivity({ unstyled = false }: RecentActivityProps) {
	const { data: realms, isPending: realmsLoading } = useQuery({
		...trpc.realm.list.queryOptions(),
	});

	// Get characters from all realms using useQueries
	const realmIds = realms?.map((realm) => realm.id) || [];
	const characterQueries = useQueries({
		queries: realmIds.map((realmId) => ({
			...trpc.character.list.queryOptions({ realmId }),
			enabled: !!realmId,
		})),
	});

	// Get traits from all realms using useQueries
	const traitQueries = useQueries({
		queries: realmIds.map((realmId) => ({
			...trpc.trait.list.queryOptions({ realmId }),
			enabled: !!realmId,
		})),
	});

	// Get members from all realms using useQueries
	const memberQueries = useQueries({
		queries: realmIds.map((realmId) => ({
			...trpc.realm.getMembers.queryOptions({ realmId }),
			enabled: !!realmId,
		})),
	});

	// Build a userId -> image map from realm members (Better Auth user images)
	const userImageById = new Map<string, string | null>();
	memberQueries.forEach((q) => {
		q.data?.forEach((m) => {
			if (!userImageById.has(m.userId)) {
				userImageById.set(m.userId, m.image ?? null);
			}
		});
	});

	const isLoading =
		realmsLoading ||
		characterQueries.some((q) => q.isPending) ||
		traitQueries.some((q) => q.isPending) ||
		memberQueries.some((q) => q.isPending);

	// Aggregate all activities
	const activities: ActivityItem[] = [];

	// Add character activities
	characterQueries.forEach((query, index) => {
		const realm = realms?.[index];
		if (realm && query.data) {
			query.data.forEach((character) => {
				if (character.createdAt) {
					activities.push({
						type: "character_created",
						entityId: character.id,
						entityName: character.name,
						realmId: realm.id,
						realmName: realm.name || "Unnamed Realm",
						userId: character.ownerId || "",
						userName: character.ownerName || "Unknown User",
						userImage: userImageById.get(character.ownerId || "") ?? null,
						timestamp: new Date(character.createdAt),
					});
				}
				if (
					character.updatedAt &&
					character.updatedAt !== character.createdAt
				) {
					activities.push({
						type: "character_updated",
						entityId: character.id,
						entityName: character.name,
						realmId: realm.id,
						realmName: realm.name || "Unnamed Realm",
						userId: character.ownerId || "",
						userName: character.ownerName || "Unknown User",
						userImage: userImageById.get(character.ownerId || "") ?? null,
						timestamp: new Date(character.updatedAt),
					});
				}
			});
		}
	});

	// Add trait activities
	traitQueries.forEach((query, index) => {
		const realm = realms?.[index];
		if (realm && query.data) {
			query.data.forEach((trait) => {
				if (trait.createdAt) {
					activities.push({
						type: "trait_created",
						entityId: trait.id,
						entityName: trait.name,
						realmId: realm.id,
						realmName: realm.name || "Unnamed Realm",
						userId: trait.createdByUserId || "",
						userName: trait.createdByName || "Unknown User",
						userImage: userImageById.get(trait.createdByUserId || "") ?? null,
						timestamp: new Date(trait.createdAt),
					});
				}
			});
		}
	});

	// Sort activities by timestamp (most recent first) and take top 5
	const recentActivities = activities
		.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
		.slice(0, 5);

	if (isLoading) {
		if (unstyled) {
			return (
				<div className="space-y-4">
					{[0, 1, 2, 3, 4].map((idx) => (
						<div
							key={`recent-activity-skeleton-${idx}`}
							className="flex items-center gap-3"
						>
							<Skeleton className="h-4 w-4 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-3 w-1/2" />
							</div>
							<Skeleton className="h-8 w-8 rounded-full" />
						</div>
					))}
				</div>
			);
		}
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="h-5 w-5" />
						Recent Activity
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{[0, 1, 2, 3, 4].map((idx) => (
						<div
							key={`recent-activity-skeleton-${idx}`}
							className="flex items-center gap-3"
						>
							<Skeleton className="h-4 w-4 rounded-full" />
							<div className="flex-1 space-y-2">
								<Skeleton className="h-4 w-3/4" />
								<Skeleton className="h-3 w-1/2" />
							</div>
							<Skeleton className="h-8 w-8 rounded-full" />
						</div>
					))}
				</CardContent>
			</Card>
		);
	}

	if (unstyled) {
		return recentActivities.length === 0 ? (
			<div className="py-8 text-center text-muted-foreground">
				<Clock className="mx-auto mb-2 h-12 w-12 opacity-50" />
				<p>No recent activity</p>
			</div>
		) : (
			<div className="space-y-4">
				{recentActivities.map((activity, index) => (
					<ActivityDescription
						key={`${activity.type}-${activity.entityId}-${index}`}
						activity={activity}
					/>
				))}
			</div>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Clock className="h-5 w-5" />
					Recent Activity
				</CardTitle>
			</CardHeader>
			<CardContent>
				{recentActivities.length === 0 ? (
					<div className="py-8 text-center text-muted-foreground">
						<Clock className="mx-auto mb-2 h-12 w-12 opacity-50" />
						<p>No recent activity</p>
					</div>
				) : (
					<div className="space-y-4">
						{recentActivities.map((activity, index) => (
							<ActivityDescription
								key={`${activity.type}-${activity.entityId}-${index}`}
								activity={activity}
							/>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
