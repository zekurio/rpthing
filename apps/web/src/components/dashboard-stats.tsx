"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import {
	Crown,
	Minus,
	Sword,
	Target,
	TrendingDown,
	TrendingUp,
	Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

interface StatCardProps {
	title: string;
	value: string | number;
	icon: React.ReactNode;
	change?: {
		value: number;
		period: string;
		trend: "up" | "down" | "neutral";
	};
	isLoading?: boolean;
}

function StatCard({ title, value, icon, change, isLoading }: StatCardProps) {
	if (isLoading) {
		return (
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="font-medium text-sm">{title}</CardTitle>
					<div className="h-4 w-4">{icon}</div>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-7 w-16" />
					{change && <Skeleton className="mt-1 h-4 w-24" />}
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="font-medium text-sm">{title}</CardTitle>
				<div className="h-4 w-4 text-muted-foreground">{icon}</div>
			</CardHeader>
			<CardContent>
				<div className="font-bold text-2xl">{value}</div>
				{change && (
					<p className="flex items-center gap-1 text-muted-foreground text-xs">
						{change.trend === "up" && (
							<TrendingUp className="h-3 w-3 text-green-500" />
						)}
						{change.trend === "down" && (
							<TrendingDown className="h-3 w-3 text-red-500" />
						)}
						{change.trend === "neutral" && (
							<Minus className="h-3 w-3 text-muted-foreground" />
						)}
						<span
							className={
								change.trend === "up"
									? "text-green-500"
									: change.trend === "down"
										? "text-red-500"
										: "text-muted-foreground"
							}
						>
							{change.value > 0 ? "+" : ""}
							{change.value}
						</span>
						<span>{change.period}</span>
					</p>
				)}
			</CardContent>
		</Card>
	);
}

export function DashboardStats() {
	const { data: realms, isPending: realmsLoading } = useQuery({
		...trpc.realm.list.queryOptions(),
	});

	// Get all characters from all realms using useQueries
	const realmIds = realms?.map((realm) => realm.id) || [];
	const characterQueries = useQueries({
		queries: realmIds.map((realmId) => ({
			...trpc.character.list.queryOptions({ realmId }),
			enabled: !!realmId,
		})),
	});

	const allCharacters = characterQueries
		.flatMap((query) => query.data || [])
		.filter(
			(char, index, self) => self.findIndex((c) => c.id === char.id) === index,
		);

	const charactersLoading = characterQueries.some((query) => query.isPending);

	// Get traits from all realms using useQueries
	const traitQueries = useQueries({
		queries: realmIds.map((realmId) => ({
			...trpc.trait.list.queryOptions({ realmId }),
			enabled: !!realmId,
		})),
	});

	const allTraits = traitQueries
		.flatMap((query) => query.data || [])
		.filter(
			(trait, index, self) =>
				self.findIndex((t) => t.id === trait.id) === index,
		);

	const traitsLoading = traitQueries.some((query) => query.isPending);

	// Get members from all realms using useQueries
	const memberQueries = useQueries({
		queries: realmIds.map((realmId) => ({
			...trpc.realm.getMembers.queryOptions({ realmId }),
			enabled: !!realmId,
		})),
	});

	const allMembers = memberQueries
		.flatMap((query) => query.data || [])
		.filter(
			(member, index, self) =>
				self.findIndex((m) => m.userId === member.userId) === index,
		);

	const membersLoading = memberQueries.some((query) => query.isPending);

	const stats = [
		{
			title: "Total Realms",
			value: realms?.length || 0,
			icon: <Crown className="h-4 w-4" />,
			isLoading: realmsLoading,
		},
		{
			title: "Characters",
			value: allCharacters.length,
			icon: <Users className="h-4 w-4" />,
			isLoading: charactersLoading,
		},
		{
			title: "Traits",
			value: allTraits.length,
			icon: <Target className="h-4 w-4" />,
			isLoading: traitsLoading,
		},
		{
			title: "Members",
			value: allMembers.length,
			icon: <Sword className="h-4 w-4" />,
			isLoading: membersLoading,
		},
	];

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{stats.map((stat) => (
				<StatCard
					key={stat.title}
					title={stat.title}
					value={stat.value}
					icon={stat.icon}
					isLoading={stat.isLoading}
				/>
			))}
		</div>
	);
}
